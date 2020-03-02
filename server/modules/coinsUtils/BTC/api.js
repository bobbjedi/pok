const seed = require('../.seed');
const btcApi = require('./bitcoin-api');
module.exports = new btcApi(seed);