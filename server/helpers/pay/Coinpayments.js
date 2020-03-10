// https://www.npmjs.com/package/coinpayments

const {coinPaymentsDb} = require('../../modules/DB');
const Db = require('../../modules/DB');
const Coinpayments = require('coinpayments');
const $u = require('../utils');
const log = require('../log');

module.exports = class {
    constructor({coinName, address, key, secret}) {
        this.coinName = coinName;
        this.cpCoinName = coinName;
        if (coinName === 'USDT'){
            this.cpCoinName = 'USDT.ERC20';
        }
        this.address = address;
        this.info = {};
        this.modelDb = Db['depositsDb_' + coinName];
        this.init({key, secret});
    }
    async init({key, secret}){
        this.client = new Coinpayments({
            key,
            secret,
        });
        this.info = await this.client.getBasicInfo();
        setInterval(() => {
            this.checkerTx();
        }, 10000);
    }
    /**
     * 
     * @param {{amount:Number, login:String}}}  
     */
    async createTransaction({amount, login}) {
        amount += 0.1; // FIXME: чит от комсы пересылки для USDT 
        const tx = await this.client.createTransaction({
            currency1: this.cpCoinName,
            currency2: this.cpCoinName,
            buyer_name: login,
            item_name: 'RFP',
            address: this.address, // адрес пересылки
            buyer_email: this.info.email,
            amount
        });
        if (tx.checkout_url){
            new coinPaymentsDb({
                coinName: this.coinName,
                amount,
                login,
                tx_id: tx.txn_id,
                key: tx.checkout_url.split('key=')[1],
                status: 'wait',
                time: $u.unix()
            }, 1);
            return tx.checkout_url;
        }
    }
    /**
     * Получить ссылки для показа по TXid
     * @param {String} txId 
     */
    getUrlsByTxId(tx){
        return {
            checkout_url: 'https://www.coinpayments.net/index.php?cmd=checkout&id=' + tx.txId + '&key=' + tx.key,
            status_url: 'https://www.coinpayments.net/index.php?cmd=status&id=' + tx.txId + '&key=' + tx.key,
            qrcode_url: 'https://www.coinpayments.net/qrgen.php?id=' + tx.txId + '&key=' + tx.key
        };
    }

    async checkerTx(){ // TODO: переписать на глобальный на все коины
        const txIds = (await coinPaymentsDb.db.syncFind({status: 'wait'}))
            .map(tx => tx.tx_id);

        if (!txIds.length){
            return;
        }
        const txs = await this.client.getTxMulti(txIds);

        for (const txId of txIds) {
            try {
                const tx = txs[txId];

                if (tx.status === 1 && tx.tx.status_text.startWith('Funds received and confirmed')) { // успешно
                    console.log('FINISHED', tx.status, tx.status_text);
                    const txDoc = await coinPaymentsDb.findOne({tx_id: txId}); 
                    const user = await $u.getUserFromQ({login: txDoc.login});
                    const _id = user && user._id || 'none';
                    const {amount} = txDoc;
                   
                    await this.modelDb.db.syncInsert({ provider: 'cps', hash: txId, user_id: _id, type: 'deposit', amount: txDoc.amount, unix: $u.unix() });
                    await txDoc.update({status: 'finish'}, 1);
                   
                    if (user) {
                        user && $u.updateUserDeposit(user, amount, this.coinName, true);
                        await user.save();
                        log.info(`newDeposit:
                            coinName ${this.coinName}
                            hash: ${txId}
                            user: ${user.login}
                            amount: ${amount}`);
                    }
                }
                if (tx.status < 0) {
                    const txDoc = await coinPaymentsDb.findOne({tx_id: txId}); 
                    await txDoc.update({status: 'fail'}, 1);
                }
            } catch (e){
                console.log(e);
            }
        }
    }
};
(async ()=>{
    // console.log('USDT.address>', USDT.address);
    // const pay = new module.exports({
    //     coinName: 'USDT',
    //     address: USDT.address,
    //     key: 'e081e8e70f94f1831ea382856efe5e18227d9de23a8c735dcd77a4733a69e4fe',
    //     secret: '747aA2144ed9E057B3ec1372f585470bf941A9a9Bcda7f849565b21f4512503e'
    // });
})();
