const configMain = require('../../configMain');
const config = require('../helpers/configReader');
const {usersDb} = require('./DB');
const minter = require('./api');
const log = require('../helpers/log');
let Store;

let isAlarm = false;

module.exports = {
    async init(){
        Store = require('./Store');
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
            }, 300 * 1000);

            // ГРЯЗНО!!
            minter.returnAmountFromMine = async amount => await this.retunFromMain(null, amount);
        }, 2000);
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
            const baseBalance = await minter.getCoinBalance();
            console.log({baseBalance});
            if (!(baseBalance > 0)){
                return log.error('baseBalance > 0 fail');
            }

            // если баланс меньше чем максимальный депозит + половина от апа
            // то нужно отзывать
            if (baseBalance < configMain.upFromMaxDep * 0.5){
                this.retunFromMain(baseBalance);
            }

            // если баланс больше чем нужен резерв
            // то нужно отсылать в майн
            if (baseBalance > configMain.upFromMaxDep * 1.5){
                this.sendToMain(baseBalance);
            }
        } catch (e){
            console.log(e);
            log.error('updateCoins: ' + e);
        }
    },
    async retunFromMain (baseBalance, needRecievedToUser = 0){
        try {
            const returnedCount = needRecievedToUser || Math.round(configMain.upFromMaxDep - baseBalance);
            log.warn(`Отзываем из майна bip:${returnedCount} baseBalance: ${baseBalance} needRecievedToUser: ${needRecievedToUser}`);
            // return;
            const res = await minter.buy({coinFrom: configMain.coin, coinTo: config.coinName, buyAmount: returnedCount});
            if (res){
                this.updatePriceCoinToDb();
            }
            return res;
        } catch (e){
            console.log(e);
            log.error('retunFromMine: ' + e);
        }
    },
    async sendToMain (baseBalance){
        try {
            const sendedCount = baseBalance - configMain.upFromMaxDep;
            log.warn(`Отправляем в майн ${sendedCount} ${config.coinName} [baseBalance: ${baseBalance}]`);
            const isClean = await this.checkRat();
            if (!isClean){
                return log.error('isClear FAIL!');
            }
            // return;
            const res = await minter.sell({coinFrom: config.coinName, coinTo: configMain.coin, sellAmount: sendedCount});
            if (res){
                this.updatePriceCoinToDb();
            }
            return res;
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
