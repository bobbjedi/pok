const log = require('../../../helpers/log');
const models = require('./erc20_models');
const ethCreator = require('./api');

module.exports = class erc20{
    constructor(token, seed){
        this.eth = ethCreator(seed);
        this.token = token;
        this.model = models[token];
        this.address = this.eth.ADDRESS;
        const web3 = this.eth.web3;
        this.web3 = web3;
        this.contract = new web3.eth.Contract(abiArray, this.model.sc, {from: this.address});
        console.log('Created ERC-20 token:', token);
    }
    async getBalance(address) {
        try {
            address = address || this.address;
            return ((await this.contract.methods.balanceOf(address).call()) || 0) / this.model.sat;
        } catch (e){
            log.error('Error while updating ' + this.token + ' balance: ' + e);
        }
    }
    /**
     * 
     * @param {{address:String, value:Number}} params Кому и сколько
     */
    async send(params) {
        console.log(this.token, 'BALANCE', this.address, await this.getBalance());
        const transfer = {
            address: this.model.sc,
            data: this.contract.methods.transfer(params.address, +(params.value * this.model.sat).toFixed(0)).encodeABI()
        };
        return await this.eth.send(params, transfer);
    }

    async getLastBlockNumber() {
        return await this.eth.getLastBlockNumber();
    }

    async syncGetTransaction(hash) {
        return new Promise(resolve =>{
            this.eth.getTransactionReceipt(hash, (err, tx) => {
                try {
                    if (err || !tx.logs) {
                        resolve(false);
                        return;
                    }
                    const info = tx.logs[0];
                    resolve({
                        blockNumber: tx.blockNumber,
                        hash: hash,
                        sender: tx.from,
                        recipient: info.topics[2].replace('000000000000000000000000', ''),
                        contract: tx.to,
                        amount: +info.data / this.model.sat
                    });
                } catch (e) {
                    resolve(false);
                }
            });
        });
    }

    async getTransactionStatus(txid){
        return await this.eth.getTransactionStatus(txid);
    }

    get FEE() {
        return 0.3;
        // let inEth = eth.FEE * 2;
        // console.log(`Fee in eth: ${inEth}`);
        // return inEth;
    }

    get FEEinToken() {
        // let inEth = eth.FEE * 2;
        // let inToken = inEth * Store.mathEqual('ETH', this.token, 1, true).exchangePrice;
        // console.log(`Fee in eth: ${inEth}`);
        // console.log(`Fee in token: ${inToken}`);
        // return inToken;
    }
};


const abiArray = [{
    'constant': true,
    'inputs': [],
    'name': 'name',
    'outputs': [{
        'name': '',
        'type': 'string'
    }],
    'payable': false,
    'stateMutability': 'view',
    'type': 'function'
}, {
    'constant': false,
    'inputs': [{
        'name': '_spender',
        'type': 'address'
    }, {
        'name': '_value',
        'type': 'uint256'
    }],
    'name': 'approve',
    'outputs': [{
        'name': '',
        'type': 'bool'
    }],
    'payable': false,
    'stateMutability': 'nonpayable',
    'type': 'function'
}, {
    'constant': true,
    'inputs': [],
    'name': 'totalSupply',
    'outputs': [{
        'name': '',
        'type': 'uint256'
    }],
    'payable': false,
    'stateMutability': 'view',
    'type': 'function'
}, {
    'constant': false,
    'inputs': [{
        'name': '_from',
        'type': 'address'
    }, {
        'name': '_to',
        'type': 'address'
    }, {
        'name': '_value',
        'type': 'uint256'
    }],
    'name': 'transferFrom',
    'outputs': [{
        'name': '',
        'type': 'bool'
    }],
    'payable': false,
    'stateMutability': 'nonpayable',
    'type': 'function'
}, {
    'constant': true,
    'inputs': [],
    'name': 'INITIAL_SUPPLY',
    'outputs': [{
        'name': '',
        'type': 'uint256'
    }],
    'payable': false,
    'stateMutability': 'view',
    'type': 'function'
}, {
    'constant': true,
    'inputs': [],
    'name': 'decimals',
    'outputs': [{
        'name': '',
        'type': 'uint8'
    }],
    'payable': false,
    'stateMutability': 'view',
    'type': 'function'
}, {
    'constant': false,
    'inputs': [{
        'name': '_spender',
        'type': 'address'
    }, {
        'name': '_subtractedValue',
        'type': 'uint256'
    }],
    'name': 'decreaseApproval',
    'outputs': [{
        'name': '',
        'type': 'bool'
    }],
    'payable': false,
    'stateMutability': 'nonpayable',
    'type': 'function'
}, {
    'constant': true,
    'inputs': [{
        'name': '_owner',
        'type': 'address'
    }],
    'name': 'balanceOf',
    'outputs': [{
        'name': 'balance',
        'type': 'uint256'
    }],
    'payable': false,
    'stateMutability': 'view',
    'type': 'function'
}, {
    'constant': true,
    'inputs': [],
    'name': 'symbol',
    'outputs': [{
        'name': '',
        'type': 'string'
    }],
    'payable': false,
    'stateMutability': 'view',
    'type': 'function'
}, {
    'constant': false,
    'inputs': [{
        'name': '_to',
        'type': 'address'
    }, {
        'name': '_value',
        'type': 'uint256'
    }],
    'name': 'transfer',
    'outputs': [{
        'name': '',
        'type': 'bool'
    }],
    'payable': false,
    'stateMutability': 'nonpayable',
    'type': 'function'
}, {
    'constant': false,
    'inputs': [{
        'name': '_spender',
        'type': 'address'
    }, {
        'name': '_addedValue',
        'type': 'uint256'
    }],
    'name': 'increaseApproval',
    'outputs': [{
        'name': '',
        'type': 'bool'
    }],
    'payable': false,
    'stateMutability': 'nonpayable',
    'type': 'function'
}, {
    'constant': true,
    'inputs': [{
        'name': '_owner',
        'type': 'address'
    }, {
        'name': '_spender',
        'type': 'address'
    }],
    'name': 'allowance',
    'outputs': [{
        'name': '',
        'type': 'uint256'
    }],
    'payable': false,
    'stateMutability': 'view',
    'type': 'function'
}, {
    'inputs': [],
    'payable': false,
    'stateMutability': 'nonpayable',
    'type': 'constructor'
}, {
    'anonymous': false,
    'inputs': [{
        'indexed': true,
        'name': 'owner',
        'type': 'address'
    }, {
        'indexed': true,
        'name': 'spender',
        'type': 'address'
    }, {
        'indexed': false,
        'name': 'value',
        'type': 'uint256'
    }],
    'name': 'Approval',
    'type': 'event'
}, {
    'anonymous': false,
    'inputs': [{
        'indexed': true,
        'name': 'from',
        'type': 'address'
    }, {
        'indexed': true,
        'name': 'to',
        'type': 'address'
    }, {
        'indexed': false,
        'name': 'value',
        'type': 'uint256'
    }],
    'name': 'Transfer',
    'type': 'event'
}];

// config.erc20.forEach(async t=>{ // Create all of ERC-20 tokens
//     new erc20(t);
// });

// const c = new module.exports('USDT', 'world public casual myself apart sight sudden air muscle almost girl short');
// console.log('>>', c.address);
setTimeout(async ()=>{
    // console.log('>>>>>>>>>>>>', await c.send({value: 1, address: '0xaffef569cb39eb2075da37a968fee163f27b96cb'}));
}, 2000); 
