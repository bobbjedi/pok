const coininfo = require('coininfo');

export default Object.freeze({
    BTC: coininfo.bitcoin.main.toBitcoinJS()
});
