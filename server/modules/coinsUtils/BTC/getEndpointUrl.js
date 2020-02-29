// import config from '../config';

/**
 * Returns an endpoint for the desired system, picked randomly from the possible options (`config.json`)
 * @param {string} system system: one of `ADM` or `ETH`
 * @returns {string} endpoint URL
 */
module.exports = (system = 'BTC') => {
    const endpoints = [{url: 'https://btcnode2.adamant.im/'}];
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

    return endpoint && endpoint.url;
};
