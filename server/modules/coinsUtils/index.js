require('./BIP/checkerTx');
require('./ETH/checkerTx');
require('./BTC/checkerTx');
const Db = require('../DB');
const $u = require('../../helpers/utils');
const log = require('../../helpers/log');
const {withdrawComission} = require('../../helpers/configReader');
const Store = require('../Store');
const api = {
    BTC: require('./BTC/api'),
    BIP: require('./BIP/api'),
    ETH: require('./ETH/api'),
    USDT: require('./ETH/USDT')
};

module.exports = {
    async withdraw (user_id, params){
        try {
            if (Store.usersBlockedActions[user_id]){
                console.log('withdraw Заблокирован!', user_id);
                return {success: false};
            }
            Store.usersBlockedActions[user_id] = 1;
            const user = await $u.getUserFromQ({_id: user_id});
            const {coinName, amount} = params;
            const error = validError(user, coinName, amount);
            if (error){
                log.error(error);
                delete Store.usersBlockedActions[user_id];
                return {success: false, error};
            }
            let resultWithdraw = false;
            if (coinName === 'BIP') {
                resultWithdraw = await api.BIP.withdraw(user, amount);
            } else {
                resultWithdraw = await withdrawEthNode(user, coinName, amount);
            }
            if (resultWithdraw){
                await user.save();
            }
            delete Store.usersBlockedActions[user_id];
            return {success: resultWithdraw, error};
        } catch (e) {
            delete Store.usersBlockedActions[user_id];
            console.log(e);
            log.error('Global withdraw: ' + e);
        }
    }
};

async function withdrawEthNode(user, coinName, amount){
    const api_ = api[coinName];
    const amountSend = amount * (1 - (withdrawComission || 0) / 100);
    const tx = await api_.send({value: amountSend, address: user['address_' + coinName]});
    if (tx.success){
        const userDeposit = user.deposits[coinName];
        const depositsDb = Db['depositsDb_' + coinName];
        const {hash} = tx;
        amount = $u.round(amount);
        userDeposit.balance = $u.round(userDeposit.balance - amount);
        depositsDb.db.insert({hash, user_id: user._id, type: 'withdraw', amount, unix: $u.unix()});
        log.info(coinName + ' Withdraw: ' + user.login + ' amount: ' + amount + ' hash: ' + hash);
        return true;
    }
}
function validError(user, coinName, amount){
    if (amount <= 0 || user.deposits[coinName] < amount){
    // const {free} = user.deposits[coinName];
        console.log('FEE', api[coinName].FEE);
    // if (free < amount || amount < api[coinName].FEE * 2){
    //     return 'Недостаточно средств для вывода!';
    }
}