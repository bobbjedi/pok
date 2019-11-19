// https://github.com/minterscan/minter_private_key/releases/download/v1.0/minter_private_key_v1.0.zip
const config = require('../helpers/configReader');
const pk = '3be19c0b2ccfd2da2e9fb5a7ced79713ddd0da45b47dfd23b9ca24ce53cf4891';
const {Minter, SendTxParams} = require('minter-js-sdk');
const ADDRESS = config.gameMinterAddress;
const COIN = config.coinName;
const minter = new Minter({chainId: 1, apiType: 'node', baseURL: 'https://api.minter.stakeholder.space/'});
const log = require('../helpers/log');
const {depositsDb} = require('./DB');
const $u = require('../helpers/utils');
// TEST
// Mx7116ac9bed12a97cfc50e807521be66304722761
//whale fetch pledge ancient rug shell burger demise swear already teach match
module.exports = {
    /**
     * @param {Object | User} user
     * @param {Number} amount
     * @return {Boolean}
     */
    async withdraw(user, amount){
        if (user.deposit + 0.5 < amount){
            return false;
        }
        console.log(amount);
        try {
            const hash = await sendTx(user.address, amount);
            amount = Math.round(amount);
            if (hash){
                user.deposit = Math.round(user.deposit - amount);
                await user.save();
                depositsDb.db.insert({hash, user_id: user._id, type: 'withdraw', amount});
                console.log(hash);
                return true;
            }
            return false;
        } catch (e){
            log.error('Withdraw: ' + e);
        }
    },
    getEqual
};

async function sendTx(address, amount){
    amount *= 1 - config.comission / 100;
    const txParams = new SendTxParams({
        privateKey: pk,
        nonce: await getNonce(),
        chainId: 1,
        address,
        amount,
        coinSymbol: COIN,
        message: 'Escaped money!'
    });
    try {
        return await minter.postTx(txParams);
    } catch (e){
        const errorMessage = e.response.data.error;
        log.error(`Send TX: ${errorMessage.tx_result.message} | ${address} | ${amount}`);
        return false;
    }
};

async function getNonce(){
    return await minter.getNonce(ADDRESS);
}

async function getEqual(sellCoin, value){
    return await minter.estimateCoinSell({
        coinToSell: sellCoin,
        valueToSell: value,
        coinToBuy: COIN,
    });
}



// (async ()=>{
//     const user = await $u.getUserFromQ({login: 'Dev4'});
//     console.log(user);
//     console.log('>>', await module.exports.withdraw(user, 1));
// })();