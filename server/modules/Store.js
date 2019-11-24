const {storeDb} = require('./DB');
module.exports = {
    isGamesPaused: false,
    async init() {
        let system = await storeDb.findOne({});
        if (!system) {
            system = new storeDb({
               totalBankAmount: 0,
               totalGamesCount: 0,
               online: 0,
               winners: {}
            });
        }
        system.save();
        this.system = system;
    },
    async save(){
        await this.system.save();
    }
}


module.exports.init();