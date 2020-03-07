require('./BIP/checkerTx');
require('./ETH/checkerTx');
require('./BTC/checkerTx');
const Db = require('../DB');
const $u = require('../../helpers/utils');
const log = require('../../helpers/log');
const _ = require('underscore');
const {withdrawComission, minWithdraw} = require('../../helpers/configReader');
const Store = require('../Store');
const USDT = require('./ETH/USDT');
const api = {
    // BTC: require('./BTC/api'),
    BIP: require('./BIP/api'),
    ETH: USDT.eth,
    USDT
};


// setTimeout(async ()=>{
//     console.log('USDT', await api.USDT.send({address: '0xaffef569cb39eb2075da37a968fee163f27b96cb', value: 3}));
// }, 8000);
module.exports = {
    /**
     * @description Вывод средств
     * @param {String} user_id id пользователя
     * @param {{coinName: String, amount: Number}} params коин, количество 
     */
    async withdraw (user_id, params){
        try {
            if (Store.usersBlockedActions[user_id]){
                console.log('withdraw Заблокирован!', user_id);
                return {success: false};
            }
            Store.usersBlockedActions[user_id] = 1;
            const user = await $u.getUserFromQ({_id: user_id});
            const {coinName, amount} = params;
            let error = validError(user, coinName, amount);

            if (error){
                log.error(error);
                delete Store.usersBlockedActions[user_id];
                return {success: false, error};
            }
            
            const amountSend = amount * (1 - (withdrawComission || 0) / 100);
            let hash = false;
            if (coinName === 'BIP') {
                hash = await api.BIP.withdraw(user.addresses.BIP, amountSend);
            } else {
                const tx = await api[coinName].send({value: amountSend, address: user.addresses[coinName]});
                hash = tx.success && tx.hash;
                tx.error && log.error(coinName + ' send error: ' + tx.error);
            }

            console.log('COMMON WITHDRAW:', user.login, {
                amount,
                amountSend,
                coinName,
                hash
            });
            if (hash){ // успешно - списываем баланс и пишем транзу в БД
                Db['depositsDb_' + coinName].db.insert({hash, user_id: user._id, type: 'withdraw', amount, unix: $u.unix()});
                await $u.updateUserDeposit(user, -amount, coinName);
            } else {
                error = 'Произошла ошибка. Попробуйте ещё раз!';
            }
            delete Store.usersBlockedActions[user_id];
            return {success: hash, error};
        } catch (e) {
            delete Store.usersBlockedActions[user_id];
            console.log(e);
            log.error('Global withdraw: ' + e);
        }
    }
};

function validError(user, coinName, amount){
    const deposit = user.deposits[coinName];
    console.log('Try Withdraw', user.login, {deposit, amount});
  
    if (!_.isNumber(deposit) || !_.isNumber(amount)){
        log.error(`validError: ${user.login} ${coinName} dep: ${deposit} amount: ${amount}`);
        return 'Ошибка системы! Попробуйте еще раз!';
    }
    if (deposit < amount) {
        return 'Недостаточно средств на балансе!';
    }
    if ((minWithdraw[coinName] || 1) > amount) {
        return 'Минимальная сумма для вывода ' + minWithdraw[coinName] + ' ' + coinName;
    }



    // if (amount <= 0 || user.deposits[coinName] < amount){
    // // const {free} = user.deposits[coinName];
    //     console.log('FEE', api[coinName].FEE);
    // // if (free < amount || amount < api[coinName].FEE * 2){
    // //     return 'Недостаточно средств для вывода!';
    // }
}