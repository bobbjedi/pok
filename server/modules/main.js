const configMain = require('../../configMain');
const {usersDb} = require('./DB');
const minter = require('./minter');
const log = require('../helpers/log');

module.exports = {
    async init(){
        log.info('Mainer started');
        this.checkMain();
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
        try {
            // const maxDeposit = await this.getMaxDeposit();
            const maxDeposit = 100; //FIXME:
            const {balances} = (await minter.getAddressData()).data;
            // const bipBalance = Math.round(+balances.find(c=>c.coin === 'BIP').amount);
            const bipBalance = 500;// FIXME:
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
            log.warn(`Отзываем из майна bip:${bipBalance}, maxDeposit: ${maxDeposit}`);
        } catch (e){
            console.log(e);
            log.error('retunFromMain: ' + e);
        }
    },
    async sendToMain (data){
        try {
            const {bipBalance, maxDeposit} = data;
            const sendedCountBip = bipBalance - maxDeposit - configMain.upFromMaxDep;
            log.warn(`Отправляем в майн ${sendedCountBip} BIP [bipBalnce: ${bipBalance}, maxDeposit: ${maxDeposit}]`);
        } catch (e){
            console.log(e);
            log.error('sendToMain: ' + e);
        }
    }
};
