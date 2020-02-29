const depositsDb = require('../../DB').depositsDb_BTC;
const $u = require('../../../helpers/utils');
const log = require('../../../helpers/log');

const api = require('./api');
const {address} = api;
const txsCash = {};

const checker = async (coinName = 'BTC') =>{
    try {
        (await api.getTransactions()).forEach(async tx=>{
            if (tx.status !== 'SUCCESS' || tx.senderId === address || tx.recipientId !== address || txsCash[tx.hash]){
                return;
            }
            console.log(tx);
            const {hash, amount, senderId} = tx;
            txsCash[hash] = 1;
            const isHas = await depositsDb.db.syncFindOne({hash});
            if (isHas){
                log.warn(coinName + ' has tx in DB: ' + hash);
                return;
            }
            log.info(coinName + ' new TX: comformations: ' + tx.confirmations + ' ' + tx.hash);
            const user = await $u.getUserFromQ({['address_' + coinName]: senderId});
            if (!user){
                depositsDb.db.insert({hash, user_id: 'none', type: 'deposit', address: senderId, amount, unix: $u.unix()});
                return log.warn(coinName + ' Cant find user! ' + senderId);
            }
            depositsDb.db.insert({hash, user_id: user._id, type: 'deposit', amount, unix: $u.unix()});
            user.deposits[coinName].balance = $u.round(user.deposits[coinName].balance + amount);
            user.save();
            log.info(`newDeposit BTC:
        hash: ${hash}
        user: ${user.login}
        amount: ${amount}`);
        });
    } catch (e){
        console.log(e);
        log.error('checkerTX BTC: ' + e);
    }
};
// checker();
setInterval(()=> checker(), 60 * 1000);
setTimeout(()=> checker('BTC'), 2 * 1000);
