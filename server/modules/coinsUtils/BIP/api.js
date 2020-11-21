const config = require('../../../helpers/configReader');
const seed = require('../.seed');
const {Minter, TX_TYPE} = require('minter-js-sdk');
const {walletFromMnemonic} = require('minterjs-wallet');
const COIN = config.coinName || 'BIP';
// const minter = new Minter({apiType: 'node', baseURL: 'https://node-api.testnet.minter.network/v2/'});
const minter = new Minter({chainId: 1, apiType: 'gate', baseURL: 'https://gate-api.minter.network/api/v2/'});
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
    async withdraw(address, amount, coinName = 'BIP', payload){
        try {
            return await sendTx(address, amount, coinName, payload);
        } catch (e){
            console.log(e);
            log.error('Withdraw BIP: ' + e);
        }
    },
    async getAddressData(address = config.gameMinterAddress){
        return await $u.asyncReq('https://explorer-api.minter.network/api/v2/addresses/' + address);
    },
    async getCoinBalance(coinName = config.coinName){
        const {balances} = (await this.getAddressData()).data;
        return Math.round(+balances.find(c=>c.coin.symbol === coinName).amount);
    },
    async buy(data){
        const {coinTo, coinFrom, buyAmount} = data;
        log.info(`BUY ${coinFrom}>${coinTo} ${buyAmount}`);
        const txParams ={
            privateKey,
            chainId: 1,
            coinFrom,
            coinTo,
            buyAmount
        };
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
        const txParams = {
            privateKey,
            chainId: 1,
            coinFrom,
            coinTo,
            sellAmount
        };
        try {
            return await minter.postTx(txParams);
        } catch (e){
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

async function sendTx(address, amount, coinName, msg){
    if (amount < 1 && !msg){
        return false;
    }
    console.log({ADDRESS, address});

    const txParams = {
        type: TX_TYPE.SEND,
        data: {
            to: address,
            value: amount,
            coin: 0, // BIP id
        },
        gasCoin: 0, // BIP id
        gasPrice: 1,
        payload: '',
    };
    try {
        return await minter.postTx(txParams, {privateKey});
    } catch (e){
        // const errorMessage = e;
        console.log('E:', e.response.data.error);
        const errorMessage = e.response.data.error.log;
        console.log(errorMessage);
        log.error(`Send TX: ${e} | ${address} | ${amount}`);
        return false;
    }
};

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
