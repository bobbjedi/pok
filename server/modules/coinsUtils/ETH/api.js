// const config = require('../../modules/configReader');
const seed = require('../.seed');
const log = require('../../../helpers/log');
const Web3 = require('web3');
const web3 = new Web3('https://ethnode1.adamant.im');// TODO: health check
const {eth} = web3;
const EthereumTx = require('ethereumjs-tx').Transaction;
const ethSat = 1000000000000000000;

// PREP KEYS PAIR
var Mnemonic = require('bitcore-mnemonic');
const hdkey = require('hdkey');
const HD_KEY_PATH = "m/44'/60'/3'/1/0";
const {bufferToHex, privateToAddress } = require('ethereumjs-util');
const mnemonic = new Mnemonic(seed, Mnemonic.Words.ENGLISH);
const seedMnemonic = mnemonic.toSeed();
const privateKeyBase = bufferToHex(hdkey.fromMasterSeed(seedMnemonic).derive(HD_KEY_PATH)._privateKey);
const ADDRESS = bufferToHex(privateToAddress(privateKeyBase));
const privateKey = Buffer.from(privateKeyBase.replace('0x', ''), 'hex');
eth.defaultAccount = ADDRESS;
eth.defaultBlock = 'latest';

module.exports = {
    sat: ethSat,
    ADDRESS,
    privateKey,
    web3,
    syncGetTransaction(hash) {
        return new Promise(resolve => {
            eth.getTransaction(hash, (err, tx) => {
                if (err) {
                    resolve(null);
                } else {
                    resolve({
                        blockNumber: tx.blockNumber,
                        hash: tx.hash,
                        sender: tx.from,
                        recipient: tx.to,
                        amount: +(tx.value / ethSat).toFixed(8)
                    });
                }
            }).catch(e=>{
                log.error(`Error while getting Tx ${hash}: ${e}`);
            });
        });
    },
    getTransactionStatus(hash) {
        return new Promise(resolve => {
            eth.getTransactionReceipt(hash, (err, tx) => {
                if (err || !tx) {
                    resolve(null);
                } else {
                    resolve({
                        blockNumber: tx.blockNumber,
                        status: tx.status
                    });
                }
            }).catch(e=>{
                log.error(`Error while getting Tx ${hash} status: ${e}`);
            });
        });
    },
    /**
     * Номер последнего блока сети
     */
    getLastBlockNumber() {
        return new Promise(resolve => {
            eth.getBlock('latest').then(block => {
                if (block) {
                    resolve(block.number);
                } else {
                    resolve(null);
                }
            }).catch(e=>{
                log.error('Error while getting ETH last block: ' + e);
            });
        });
    },
    updateGasPrice() {
        return new Promise(resolve => {
            eth.getGasPrice().then(price => {
                if (price) {
                    this.gasPrice = web3.utils.toHex(price);
                }
                resolve();
            }).catch(e=>{
                log.error('Error while updating Ether gas price: ' + e);
            });
        });
    },
    updateBalance(){
        eth.getBalance(ADDRESS).then(balance => {
            if (balance){
                return balance / ethSat;
            }
        }).catch(e=>{
            log.error('Error while updating ETH balance: ' + e);
        });
    },
    get FEE() {
        return this.gasPrice * 22000 / ethSat * 2;
    },
    getNonce() {
        return new Promise(resolve => {
            eth.getTransactionCount(ADDRESS).then(nonce => {
                this.currentNonce = nonce;
                resolve(nonce);
            }).catch(e =>{
                log.error('Error while updating ETH nonce: ' + e);
                setTimeout(()=>{
                    this.getNonce();
                }, 2000);
            });
        });
    },
    async send(params, contract) {
        try {
            const txParams = {
                nonce: this.currentNonce++,
                gasPrice: this.gasPrice,
                gas: web3.utils.toHex(22000 * 2),
                to: params.address,
                value: params.value * ethSat
            };
            if (contract){ // ERC20
                txParams.value = '0x0';
                txParams.data = contract.data;
                txParams.to = contract.address;
                txParams.gas *= 2;
            }

            const tx = new EthereumTx(txParams);
            tx.sign(privateKey);
            const serializedTx = '0x' + tx.serialize().toString('hex');
            return new Promise(resolve => {
                eth.sendSignedTransaction(serializedTx)
                    .on('transactionHash', (hash) => {
                        resolve({success: true, hash});
                    }).on('error', (error) => { // If a out of gas error, the second parameter is the receipt.
                        resolve({success: false, error});
                    });
            });
        } catch (e) {
            log.error('Error while executing Ethereum transaction: ' + e);
        }
    },
    lastNonce: 0,
};

// Init
module.exports.updateGasPrice();
module.exports.getNonce();

setInterval(() => {
    module.exports.updateGasPrice();
}, 10 * 1000);
