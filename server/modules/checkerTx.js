const config = require('../helpers/configReader');
const request = require('request');
const {depositsDb, restorePswdDb} = require('./DB');
const $u = require('../helpers/utils');
const log = require('../helpers/log');
const {getEqual, sendTx} = require('../modules/minter');

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
                const address = tx.from;
                const payload = tx.payload;
                const user = await $u.getUserFromQ({address});
                if (!user){
                    log.warn('Cant find user! ' + tx.from);
                    const amount = Math.round(+tx.data.value) * 0.99;
                    if (amount < 2){
                        return;
                    }
                    // const hashBack = await sendTx(address, amount);
                    // depositsDb.db.insert({hash, hashBack, user_id: 'none', from: address, type: 'back', amount});
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
                    user: ${user.login}
                    amount: ${amount}`);
                }
                $u.updateChipsUserPlayers(user);
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