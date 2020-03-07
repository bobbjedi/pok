const request = require('request');
const Db = require('../../DB');
const $u = require('../../../helpers/utils');
const log = require('../../../helpers/log');
const USDT = require('./USDT');

const {ADDRESS, getLastBlockNumber, sat} = require('./USDT').eth;
const coins = {
    ETH: {
        sat,
        depositsDb: Db.depositsDb_ETH
    },
    USDT: {
        sat: USDT.model.sat,
        depositsDb: Db.depositsDb_USDT
    }
};
const txsCash = {};
// ,https://explorer-api.minter.network/api/v1/addresses/Mxfdfc236848d445e754b6660bec98a046ac59b5cd/transactions?page=1



const checker = async coinName =>{
    console.log('checker', coinName, ADDRESS);
    const {sat, depositsDb} = coins[coinName];
    const lastBockNumber = await getLastBlockNumber();
    if (!lastBockNumber){
        return;
    }
    let url = '';
    if (coinName === 'ETH'){
        url = 'http://api.etherscan.io/api?module=account&action=txlist&address=' + ADDRESS + '&startblock=' + (lastBockNumber - 100000) + '&endblock=99999999';
    }
    if (coinName === 'USDT'){
        url = 'http://api.etherscan.io/api?module=account&action=tokentx&contractaddress=' + USDT.model.sc + '&address=' + ADDRESS + '&startblock=' + (lastBockNumber - 100000) + '&endblock=99999999';

        // http://api.etherscan.io/api?module=account&action=tokentx&address=0x4e83362442b8d1bec281594cea3050c8eb01311c&startblock=0&endblock=999999999&sort=asc&apikey=YourApiKeyToken
    }
    request(url, async (err, res, body) => {
        try {
            const data = JSON.parse(body);
            if (!data.result || !data.result.length){
                // console.log('coinName Error:', data);
                return;
            }
            const txs = data.result;
            for (const tx of txs) {
                // проверяем транзу по hash
                if (+tx.confirmations < 5){
                    continue;
                }
                const {hash} = tx;
                if (txsCash[hash]){
                    continue;
                }

                txsCash[hash] = 1;
                const isHas = await depositsDb.db.syncFindOne({hash});
                if (isHas){
                    log.warn(coinName + ' has tx in DB: ' + hash);
                    continue;
                }

                log.info(coinName + ' new TX: comformations:' + (+tx.confirmations) + ' ' + tx.hash);
                const address = tx.from;
                const amount = $u.round(+tx.value / sat);
                const user = await $u.getUserFromQ({
                    $where: function () {
                        return this.addresses[coinName] === address;
                    }
                });
                if (!user){
                    depositsDb.db.insert({hash, user_id: 'none', type: 'deposit', address, amount, unix: $u.unix()});
                    log.warn(coinName + 'Cant find user! ' + address);
                    continue;
                }

                if (amount > 0.00001){
                    depositsDb.db.insert({hash, user_id: user._id, type: 'deposit', amount, unix: $u.unix()});
                    $u.updateUserDeposit(user, amount, coinName, true);
                    user.save();
                    log.info(`newDeposit:
                    coinName ${coinName}
                    hash: ${hash}
                    user: ${user.login}
                    amount: ${amount}`);
                }
            };

        } catch (e) {
            console.log(e);
            log.error('Error TX parser! ' + e);
        }
    });
};

// setInterval(()=> checker('ETH'), 120 * 1000);
setInterval(()=> checker('USDT'), 10 * 1000);
