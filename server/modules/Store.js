const config = require('../helpers/configReader');
const {storeDb} = require('./DB');
const Mtt = require('./Mtt');
let $u;
module.exports = {
    isGamesPaused: false,
    async init() {
        $u = require('../helpers/utils');
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
        system.rakes = system.rakes || {};
        config.coins.forEach(c=> {
            system.rakes[c] = system.rakes[c] || {};
            if (typeof system.rakes[c] === 'number'){
                system.rakes[c] = {};
            }
        });
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
        const buyIn = params.buyIn >= 0 ? params.buyIn : 100;
        this.system.mtt = {
            date: params.date || 'Будет обьявлено',
            isRegOppened: true,
            title: params.title,
            winnersCount: params.winnersCount || 3,
            buyIn: buyIn,
            timeOutShufflePlayers: params.timeOutShufflePlayers || 5,
            tableSeatsCount: params.tableSeatsCount || 6,
            chips: params.chips || 1500,
            timeOutMult: params.timeOutMult || 5,
            coinName: params.coinName || 'BIP',
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
    async rmMtt(isReturnChips){
        const mtt = this.system.mtt;
        console.log('mtt.users:', mtt.users);
        if (isReturnChips && mtt.users){
            await $u.multSendCoins(mtt.users, mtt.buyIn);
        }
        this.system.mtt = {};
        this.save();
    }
};

module.exports.init();