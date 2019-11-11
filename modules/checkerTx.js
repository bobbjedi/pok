const config = require('../helpers/configReader');
const request = require('request');
const {depositsDb} = require('./DB');
const $u = require('../helpers/utils');
const log = require('../helpers/log');
const {getEqual} = require('../modules/minter');

const txsCash = {};
// ,https://explorer-api.minter.network/api/v1/addresses/Mxfdfc236848d445e754b6660bec98a046ac59b5cd/transactions?page=1
setInterval(() => {
    request('https://explorer-api.minter.network/api/v1/addresses/' + config.gameMinterAddress + '/transactions?page=1', (err, res, body) => {
        try {
            const txs = JSON.parse(body).data;
            txs.forEach(async tx => {
                // проверяем транзу по hash
                const {hash} = tx;
                if (txsCash[hash]){
                    return;
                }
                txsCash[hash] = 1;
                log.info('New TX: ' + tx.hash);
                const isHas = await depositsDb.db.syncFindOne({hash});
                if (isHas){
                    log.warn('Has tx in DB: ' + hash);
                    return;
                }
                const user = await $u.getUserFromQ({address: tx.from});
                if (!user){
                    log.warn('Cant find user! ' + tx.from);
                    return;
                }

                const amountTx = +tx.data.value;
                if (amountTx <= 0){
                    return;
                }
                let amount;
                if (tx.data.coin !== config.coinName){
                    const convert = await getEqual(tx.data.coin, amountTx);
                    amount = convert.will_get * 0.95;
                    log.info(`Convert ${amountTx} ${tx.data.coin} to ${amount} ${config.coinName}`);
                } else {
                    amount = amountTx;
                };
                if (amount > 0){
                    // amount *= 1 - config.comission;
                    depositsDb.db.insert({hash, user_id: user._id, type: 'deposit', amount});
                    user.deposit += amount;
                    user.save();
                    log.info(`newDeposit:
                    hash: ${hash}
                    user_id: ${user._id}
                    amount: ${amount}`);
                }
            });

        } catch (e) {
            log.error('Error TX parser! ' + e);
        }
    });
}, 10 * 1000);
