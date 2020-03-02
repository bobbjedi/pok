
const passphrase = 'zebra melt often nephew urge leave debris rich velvet kiwi safe enrich';


const btcApi = require('./bitcoin-api');
const api = new btcApi(passphrase);
const B = '1JFtbRR51Zsj5NjeGsUKe4NhLfodYakPRV';
(async ()=>{
    // console.log('Address:', api.address);
    // const tx = await api.createTransaction(B, 0.0001, 0.00001);
    // const tx = await api.getTransaction('85afbc518d190a8b851abee6070b46d68470c6236c44864409d1511de1fb484b');
    // console.log(tx);
    // console.log(await api.sendTransaction(tx.hex));
})();