const configMain = require('../../configMain');
const config = require('../helpers/configReader');
const {usersDb} = require('./DB');
const minter = require('./minter');
const log = require('../helpers/log');
const $u = require('../helpers/utils');
const Store = require('./Store');

let isAlarm = false;

module.exports = {
    async init(){
        log.info('Mainer started');
        setTimeout(async()=>{
            if (Store.system.failCoins.includes(configMain.coin)){
                return log.error('Коин для майнинга зафачен!!!:' + configMain.coin);
            }
            // console.log('Buy>', await minter.buy({coinTo: 'BIP', coinFrom: 'ESCAPE', buyAmount: 1}));
            // console.log('Sell>', await minter.sell({coinTo: 'BIP', coinFrom: 'ESCAPE', sellAmount: 1}));
            this.checkMain();
            setInterval(()=>{
                this.checkMain();
            }, 60000);
        }, 5000);
    },
    async getMaxDeposit(){
        try {
            const richestUser = (await usersDb.db.syncFind()).sort((b, a) => (a.deposit + b.depositInGame) - (b.deposit + b.depositInGame))[0];
            return Math.round(richestUser.deposit + richestUser.depositInGame);
        } catch (e){
            console.log(e);
            log.error('getMaxDeposit: ' + e);
            return null;
        }
    },
    // Проверяем балансы и майн
    async checkMain() {
        if (isAlarm){
            return log.error('Mainer ALARM');
        }
        try {
  
            // const bipBalance = 5;// FIXME:
            // const maxDeposit = 10; //FIXME:

            const maxDeposit = await this.getMaxDeposit();
            const {balances} = (await minter.getAddressData()).data;
            const bipBalance = Math.round(+balances.find(c=>c.coin === 'BIP').amount);
          
            if (!(bipBalance > 0)){
                return log.error('bipBalance > 0 fail');
            }

            // если баланс меньше чем максимальный депозит + половина от апа
            // то нужно отзывать
            if (bipBalance < (maxDeposit + configMain.upFromMaxDep * 0.5)){
                this.retunFromMain({bipBalance, maxDeposit});
            }

            // если баланс больше чем нужен резерв
            // то нужно отсылать в майн
            if (bipBalance > (maxDeposit + configMain.upFromMaxDep * 2)){
                this.sendToMain({bipBalance, maxDeposit});
            }
        } catch (e){
            console.log(e);
            log.error('updateCoins: ' + e);
        }
    },
    async retunFromMain (data){
        try {
            const {bipBalance, maxDeposit} = data;
            const returnedBip = Math.round(maxDeposit + configMain.upFromMaxDep - bipBalance);
            log.warn(`Отзываем из майна bip:${returnedBip} [bipBalance: ${bipBalance} | maxDeposit: ${maxDeposit}]`);
            return;
            const res = await minter.buy({coinTo: config.coinName, coinFrom: configMain.coin, buyAmount: returnedBip});
            if (res){
                this.updatePriceCoinToDb();
            }
        } catch (e){
            console.log(e);
            log.error('retunFromMine: ' + e);
        }
    },
    async sendToMain (data){
        try {
            const {bipBalance, maxDeposit} = data;
            const sendedCountBip = bipBalance - maxDeposit - configMain.upFromMaxDep;
            log.warn(`Отправляем в майн ${sendedCountBip} BIP [bipBalnce: ${bipBalance}, maxDeposit: ${maxDeposit}]`);
            const isClean = await this.checkRat();
            if (!isClean){
                return log.error('isClear FAIL!');
            }
            return;
            const res = await minter.sell({coinTo: config.coinName, coinFrom: configMain.coin, sellAmount: sendedCountBip});
            if (res){
                this.updatePriceCoinToDb();
            }
        } catch (e){
            console.log(e);
            log.error('sendToMine: ' + e);
        }
    },
    async checkRat() {
        try {
            const lastPrice = Store.system.lastPriceMainerCoin || 0;
            let isClean = true; // чисто и можно входить в коин
            const equal = await this.getCurretPriceMainerCoin();
            if (lastPrice > 0){
                if (equal && equal !== lastPrice){
                    isAlarm = true;
                    isClean = false;
                    Store.system.failCoins.push(configMain.coin);
                    Store.save();
                }
                log.info(`[checkRat] Equal: ${equal} | lastPrice: ${lastPrice} [isClear: ${equal === lastPrice}]`);
            };
            Store.system.lastPriceMainerCoin = Store.system.lastPriceMainerCoin || equal; // сохраняем
            Store.save();
            return isClean;
        } catch (e) {
            console.log(e);
            log.error('sendToMain: ' + e);
        }
    },
    async getCurretPriceMainerCoin(){
        const data = await minter.getEqual(configMain.coin, 1);
        return data && +data.will_get;
    },
    updatePriceCoinToDb() {
        setTimeout(async () => {
            const price = await this.getCurretPriceMainerCoin();
            console.log({price});
            if (!price || price === Store.system.lastPriceMainerCoin) {
                return this.updatePriceCoinToDb();
            }
            Store.system.lastPriceMainerCoin = price;
            Store.save();
        }, 1000);
    }
};
