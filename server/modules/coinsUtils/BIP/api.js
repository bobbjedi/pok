const config = require('../../../helpers/configReader');
const seed = require('../.seed');
const {Minter, SendTxParams, BuyTxParams, SellTxParams} = require('minter-js-sdk');
const {walletFromMnemonic} = require('minterjs-wallet');
const COIN = config.coinName || 'BIP';
const minter = new Minter({chainId: 1, apiType: 'gate', baseURL: 'https://gate-api.minter.network/api/v1/'});
const log = require('../../../helpers/log');
const $u = require('../../../helpers/utils');

const bipWallet = walletFromMnemonic(seed);
const ADDRESS = bipWallet.getAddressString();
const privateKey = bipWallet.getPrivateKeyString();

module.exports = {
    ADDRESS,
    privateKey,
    /**
     * @param {Object | User} user
     * @param {Number} amount
     * @return {Boolean}
     */
    async withdraw(address, amount){
        try {
            return await sendTx(address, amount);
        } catch (e){
            console.log(e);
            log.error('Withdraw BIP: ' + e);
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
            privateKey,
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
            privateKey,
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
    get FEE(){
        return 0.1;
    },
    seedToPk(){

    },
    getEqual,
    sendTx
};

async function sendTx(address, amount, msg){
    if (amount < 1 && !msg){
        return false;
    }
    console.log({ADDRESS, address});
    const txParams = new SendTxParams({
        privateKey,
        nonce: await getNonce(),
        chainId: 1,
        address,
        amount,
        coinSymbol: COIN,
        message: msg || ''
    });
    try {
        console.log(txParams);
        return await minter.postTx(txParams);
    } catch (e){
        console.log(e.response);
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
