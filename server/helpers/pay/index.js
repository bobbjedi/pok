const {address} = require('../../modules/coinsUtils/ETH/USDT');
const Coinpayments = require('./Coinpayments');

module.exports = {
    USDT: new Coinpayments({
        coinName: 'USDT',
        address: address,
        key: 'e081e8e70f94f1831ea382856efe5e18227d9de23a8c735dcd77a4733a69e4fe',
        secret: '747aA2144ed9E057B3ec1372f585470bf941A9a9Bcda7f849565b21f4512503e'
    })
};