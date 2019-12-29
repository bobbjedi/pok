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
            date: params.date || 'Инфа в канале',
            isRegOppened: true,
            winnersCount: params.winnersCount || 3,
            // buyIn: params.buyIn || 1,
            // timeOutShufflePlayers: params.timeOutShufflePlayers || 5,
            // tableSeatsCount: params.tableSeatsCount || 6,
            // chips: params.chips || 1500,
            // timeOutMult: params.timeOutMult || 5,
            
            buyIn: params.buyIn || 500,
            timeOutShufflePlayers: params.timeOutShufflePlayers || 5,
            tableSeatsCount: params.tableSeatsCount || 6,
            chips: params.chips || 2000,
            timeOutMult: params.timeOutMult || 10,

            users: []
        };
        this.save();
    },
    async startMtt(){
        const {system} = this;
        const params = system.mtt;
        this.rmMtt();
        this.MTT = new Mtt(params, this);
    },
    rmMtt(){
        this.system.mtt = {};
        this.save();
    }
};

module.exports.init();