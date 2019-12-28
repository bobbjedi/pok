const {storeDb} = require('./DB');
const Mtt = require('./Mtt');

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
                winners: {},
                mtt: {}
            });
        }
        system.failCoins = system.failCoins || [];
        system.mtt = system.mtt || {};
        system.save();
        this.system = system;
    },
    async save(){
        await this.system.save();
    },
    /**
     * 
     * @param {Object} params  
     * users {Array} ['Dev', 'Dev1'...]
     */
    createMtt(params = {}) {
        this.system.mtt = {
            isRegStopped: false,
            winnersCount: params.winnersCount || 3,
            timeOutShufflePlayers: params.timeOutShufflePlayers || 5,
            tableSeatsCount: params.tableSeatsCount || 6,
            users: []
        };
        this.save();
    },
    async startMtt(){
        const {system} = this;
        const params = system.mtt;
        system.mtt = {};
        this.save();
        this.MTT = new Mtt(params, this);
    }
};

module.exports.init();