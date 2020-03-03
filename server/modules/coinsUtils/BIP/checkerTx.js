const config = require('../../../helpers/configReader');
const request = require('request');
const {restorePswdDb} = require('../../DB');
const depositsDb = require('../../DB').depositsDb_BIP;
const $u = require('../../../helpers/utils');
const log = require('../../../helpers/log');
const {getEqual} = require('../../minter');
const coinName = 'BIP';
const txsCash = {};
// ,https://explorer-api.minter.network/api/v1/addresses/Mxfdfc236848d445e754b6660bec98a046ac59b5cd/transactions?page=1
setInterval(() => {
    request('https://explorer-api.minter.network/api/v1/addresses/' + config.gameMinterAddress + '/transactions?page=1', async (err, res, body) => {
        try {
            const txs = JSON.parse(body).data;
            for (const tx of txs) {
                // проверяем транзу по hash
                const {hash} = tx;
                if (txsCash[hash]){
                    continue;
                }
                txsCash[hash] = 1;
                log.info('New TX: ' + tx.hash);
                const isHas = await depositsDb.db.syncFindOne({hash});
                if (isHas){
                    log.warn('Has tx in DB: ' + hash);
                    continue;
                }
                const address = tx.from;
                const payload = tx.payload;
                const user = await $u.getUserFromQ({
                    $where: function () {
                        return this.addresses[coinName] === address;
                    }
                });
                if (!user){
                    log.warn('Cant find user! ' + tx.from);
                    // const amount = Math.round(+tx.data.value) * 0.99;
                    // if (amount < 2){
                    //     continue;
                    // }
                    continue;
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
                    continue;
                }
                let amount;
                console.log('tx.data.coin ', tx.data.coin);
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
                    // user.deposit += amount;
                    $u.updateUserDeposit(user, amount, coinName, true);
                    await user.save();
                    log.info(`newDeposit:
                    hash: ${hash}
                    user: ${user.login}
                    amount: ${amount}`);
                }
                // $u.updateChipsUserPlayers(user, coinName);
            };

        } catch (e) {
            console.log(e);
            log.error('Error TX parser! ' + e);
        }
    });
}, 5 * 1000);


function payloadToString(payload) {
    const buff = Buffer.from(payload, 'base64');
    return buff.toString('ascii');
}