const request = require('request');
const {restorePswdDb} = require('../../DB');
const depositsDb = require('../../DB').depositsDb_BIP;
const $u = require('../../../helpers/utils');
const log = require('../../../helpers/log');
const config = require('../../../helpers/configReader');
// const Store = require('../../../helpers/Store');

const {getEqual, ADDRESS} = require('./api');

const coinName = config.coinName || 'BIP';
const txsCash = {};
console.log(ADDRESS);
// ,https://explorer-api.minter.network/api/v1/addresses/Mxfdfc236848d445e754b6660bec98a046ac59b5cd/transactions?page=1
setInterval(() => {
    request('https://explorer-api.minter.network/api/v1/addresses/' + ADDRESS + '/transactions?page=1', (err, res, body) => {
        try {
            const txs = JSON.parse(body).data;
            txs.forEach(async tx => {
                // проверяем транзу по hash
                const {hash} = tx;
                if (txsCash[hash]){
                    return;
                }
                txsCash[hash] = 1;
                const isHas = await depositsDb.db.syncFindOne({hash});
                if (isHas){
                    log.warn('BIP Has tx in DB: ' + hash);
                    return;
                }
                log.info('BIP new TX: ' + tx.hash);
                const address = tx.from;
                const payload = tx.payload;
                const user = await $u.getUserFromQ({$where: function () {
                    return this.addresses[coinName] === address;
                }});
                if (!user){ 
                    log.warn('Cant find user! ' + tx.from);
                    const amount = Math.round(+tx.data.value) * 0.99;
                    if (amount < 2){
                        return;
                    }
                    // const hashBack = await sendTx(address, amount);
                    depositsDb.db.insert({hash, user_id: 'none', from: address, type: 'deposit', amount, unix: $u.unix()});
                    return;
                }

                // Возможно восстановление
                if (payload.length){
                    const controlWord = payloadToString(payload);
                    const doc = await restorePswdDb.findOne({controlWord});
                    if (doc){
                        user.password = doc.password;
                        restorePswdDb.db.remove({password: doc.password});
                        await user.save();
                    }
                }
                const amountTx = +tx.data.value;
                if (amountTx <= 0){
                    return;
                }
                let amount;
                if (tx.data.coin !== coinName){
                    const convert = await getEqual(tx.data.coin, amountTx);
                    amount = convert.will_get * 0.95;
                    log.info(`Convert ${amountTx} ${tx.data.coin} to ${amount} ${coinName}`);
                } else {
                    amount = amountTx;
                };
                if (amount > 0){
                    // amount *= 1 - config.comission;
                    depositsDb.db.insert({hash, user_id: user._id, type: 'deposit', amount, unix: $u.unix()});
                    // user.deposits[coinName].balance = $u.round(user.deposits[coinName].balance + amount);
                    $u.updateUserDeposit(user, amount, coinName, true);
                    user.save();
                    log.info(`newDeposit:
                    hash: ${hash}
                    user: ${user.login}
                    amount: ${amount}`);
                }
            });

        } catch (e) {
            console.log(e);
            log.error('Error TX parser! ' + e);
        }
    });
}, 10 * 1000);


function payloadToString(payload) {
    let buff = Buffer.from(payload, 'base64');
    return buff.toString('ascii');
}
