const {storeDb} = require('./DB');
module.exports = {
    isGamesPaused: false,
    async init() {
        let system = await storeDb.findOne({});
        if (!system) {
            system = new storeDb({
                lastPriceMainerCoin: 0,
                totalBankAmount: 0,
                totalGamesCount: 0,
                online: 0,
                winners: {}
            });
        }
        system.failCoins = system.failCoins || [];
        system.save();
        this.system = system;
    },
    async save(){
        await this.system.save();
    }
};


module.exports.init();
