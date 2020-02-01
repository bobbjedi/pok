// https://github.com/minterscan/minter_private_key/releases/download/v1.0/minter_private_key_v1.0.zip
const config = require('../helpers/configReader');
const pk = require('../.pk');
const {Minter, SendTxParams, BuyTxParams, SellTxParams} = require('minter-js-sdk');
const ADDRESS = config.gameMinterAddress;
const COIN = config.coinName;
const minter = new Minter({chainId: 1, apiType: 'gate', baseURL: 'https://gate-api.minter.network/api/v1/'});
const log = require('../helpers/log');
const {depositsDb} = require('./DB');
const $u = require('../helpers/utils');

// TEST
// Mx7116ac9bed12a97cfc50e807521be66304722761
//whale fetch pledge ancient rug shell burger demise swear already teach match
const withdrawBlocked = {};
module.exports = {
    /**
     * @param {Object | User} user
     * @param {Number} amount
     * @return {Boolean}
     */
    async withdraw(user, amount){
        console.log({withdrawBlocked});
        if (withdrawBlocked[user._id]){
            log.error('withdraw withdrawBlocked:' + user.login);
            return false;
        }
        const amountSend = amount * (1 - (config.withdrawComission || 0) / 100);
        if (user.deposit + 0.5 < amountSend){
            return false;
        }

        try {
            withdrawBlocked[user._id] = true;
            const balance = await this.getCoinBalance(); // баланс игрового кошелька
            if (balance < amountSend){ // надо отзывать из майна
                log.warn(`Отзывам из майна на выплату Balance: ${balance} recived: ${amount}`);
                const res = await this.returnAmountFromMine(amountSend);
                log.info('Отзыв: ' + res);
                if (!res){
                    delete withdrawBlocked[user._id];
                    return false;
                }
                await $u.wait(6);
            }
            const hash = await sendTx(user.address, amountSend);
            amount = Math.round(amount);
            if (hash){
                await $u.updateUserDeposit(user, -amount);
                depositsDb.db.insert({hash, user_id: user._id, type: 'withdraw', amount, unix: $u.unix()});
                log.info('Withdraw: ' + user.login + ' amount: ' + amount + ' hash: ' + hash);
                $u.updateChipsUserPlayers(user);
                delete withdrawBlocked[user._id];
                return true;
            }
            delete withdrawBlocked[user._id];
            return false;
        } catch (e){
            console.log(e);
            log.error('Withdraw: ' + e);
            delete withdrawBlocked[user._id];
        }
    },
    async getAddressData(address = config.gameMinterAddress){
        return await $u.asyncReq('https://explorer-api.minter.network/api/v1/addresses/' + address);
    },
    async getCoinBalance(coinName = config.coinName){
        const {balances} = (await this.getAddressData()).data;
        return Math.round(+balances.find(c=>c.coin === coinName).amount);
    },
    async buy(data){
        const {coinTo, coinFrom, buyAmount} = data;
        log.info(`BUY ${coinFrom}>${coinTo} ${buyAmount}`);
        const txParams = new BuyTxParams({
            privateKey: pk,
            chainId: 1,
            coinFrom,
            coinTo,
            buyAmount
        });
        try {
            return await minter.postTx(txParams);
        } catch (e){
            console.log(e);
            const errorMessage = e.response.data.error;
            log.error(`Buy TX: ${errorMessage.tx_result.message} | ${buyAmount} | ${coinTo}`);
            return false;
        }
    },
    async sell(data){
        const {coinTo, coinFrom, sellAmount} = data;
        log.info(`BUY ${coinFrom}>${coinTo} ${sellAmount}`);
        const txParams = new SellTxParams({
            privateKey: pk,
            chainId: 1,
            coinFrom,
            coinTo,
            sellAmount
        });
        try {
            return await minter.postTx(txParams);
        } catch (e){
            console.log(e);
            const errorMessage = e.response.data.error;
            log.error(`Sell TX: ${errorMessage.tx_result.message} | ${sellAmount} | ${coinTo}`);
            return false;
        }
    },
    getEqual,
    sendTx
};

async function sendTx(address, amount, msg){
    if (amount < 1 && !msg){
        return false;
    }
    const txParams = new SendTxParams({
        privateKey: pk,
        nonce: await getNonce(),
        chainId: 1,
        address,
        amount,
        coinSymbol: COIN,
        message: msg || ''
    });
    try {
        return await minter.postTx(txParams);
    } catch (e){
        console.log(e);
        const errorMessage = e.response.data.error;
        log.error(`Send TX: ${errorMessage.tx_result.message} | ${address} | ${amount}`);
        return false;
    }
};

async function getNonce(){
    return await minter.getNonce(ADDRESS);
}

async function getEqual(sellCoin, value, buyCoin){
    try {
        return await minter.estimateCoinSell({
            coinToSell: sellCoin,
            valueToSell: value,
            coinToBuy: buyCoin || COIN,
        });
    } catch (e){
        log.error('Error estimateCoinSell:' + e);
        return false;
    }
}
