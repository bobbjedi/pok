const BtcBaseApi = require('./btc-base-api');
const log = require('../../../helpers/log');

module.exports = class BitcoinApi extends BtcBaseApi {
    constructor (passphrase) {
        super(passphrase);
    }

    /**
   * @override
   */
    async send(params) {
        // {value: amountSend, address: user['address_' + coinName]}
        try {
            const tx = await this.createTransaction(params.address, params.value, this.getFee());
            const result = await this.sendTransaction(tx.hex);
            if (typeof result === 'string'){
                return {success: true, hash: result};
            } else {
                return {success: false};
            }
        } catch (e) {
            console.log(e);
            log.error('BTC send: ' + e);
        }
    }
    getBalance () {
        return this._get(`/address/${this.address}`).then(
            data => (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) / this.multiplier
        );
    }

    /** @override */
    getFee () {
        return 0.00001;
    }

    get FEE(){
        return this.getFee();
    }
    get ADDRESS(){
        return this._address;
    }
    /** Returns last block height */
    getHeight () {
        return this._get('/blocks/tip/height').then(data => Number(data) || 0);
    }

    /** @override */
    sendTransaction (txHex) {
        return this._getClient().post('/tx', txHex).then(response => response.data);
    }

    /** @override */
    getTransaction (txid) {
        return this._get(`/tx/${txid}`).then(x => this._mapTransaction(x));
    }

    /** @override */
    // async getTransactions({ toTx = '' }) {
    async getTransactions() {
        try {
            let url = `/address/${this.address}/txs`;
            // if (toTx) {
            //     url += `/chain/${toTx}`;
            // }
            return await this._get(url).then(transactions => transactions.map(x => this._mapTransaction(x)));
        } catch (e) {
            console.log('Error getTransactions:', e);
        }
    }

    /** @override */
    async getUnspents() {
        try {
            return await this._get(`/address/${this.address}/utxo`).then(outputs =>
                outputs.map(x => ({ txid: x.txid, amount: x.value, vout: x.vout }))
            );
        } catch (e) {
            console.log('Error getUnspents:', e);
        }
    }

    getFeeRate () {
        return this._get('/fee-estimates').then(estimates => estimates['2']);
    }

    /** @override */
    _mapTransaction (tx) {
        const mapped = super._mapTransaction({
            ...tx,
            vin: tx.vin.map(x => ({ ...x, addr: x.prevout.scriptpubkey_address })),
            vout: tx.vout.map(x => ({
                ...x,
                scriptPubKey: { addresses: [x.scriptpubkey_address] }
            })),
            fees: tx.fee,
            time: tx.status.block_time,
            confirmations: tx.status.confirmed ? 1 : 0
        });

        mapped.amount /= this.multiplier;
        mapped.fee /= this.multiplier;
        mapped.height = tx.status.block_height;

        return mapped;
    }

    /** Executes a GET request to the API */
    async _get (url, params) {
        try {
            return await this._getClient().get(url, params).then(response => response.data);
        } catch (e){
            console.log('Error _get:', e);
        }
    }
};
