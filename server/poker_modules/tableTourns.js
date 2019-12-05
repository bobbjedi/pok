const $u = require('../helpers/utils');
const log = require('../helpers/log');

module.exports = Table =>{
    Table.prototype.updateTournParams = function () {
        if (!this.timeParams.length) {
            return;
        }
        const next = this.timeParams.shift();
        this.public.smallBlind = next.sb;
        this.public.bigBlind = next.sb * 2;
        this.public.ante = next.ante;
        log.info('updateTournParams: ' + JSON.stringify(next));
    };
    
    Table.prototype.timeOutUpdateTournParams = function () {
        this.updateTournParams();
        this.timeOutUpdateTourn = setTimeout(()=>{
            this.timeOutUpdateTournParams();
        }, 300 * 1000);
    };


    Table.prototype.tournStart = async function(){
        if (!this.isTourn || this.isTournStart){
            return;
        }
        console.log('Start turn');
        this.timeOutUpdateTournParams();
        this.public.tournPrize = this.public.minBuyIn * this.tournPlayersCount;
        this.isTournStart = true;
        for (let i = 0; i < this.public.seatsCount; i++){
            const s = this.seats[i];
            if (!this.seats[i]){
                continue;
            }
            this.public.tournSeats[i] = {name: s.public.name, chipsInPlay: 0};
            s.public.chipsInPlay = 0;
            await s.updateDepInPlay();
            s.public.chipsInPlay = this.tournChips;
            s.chips = 0;
            s.isTourn = true; // определяем что в турнире
            log.info('in Tourn: ' + s.public.name);
        };
    };
    
    Table.prototype.tournStop = async function(){
        if (!this.isTourn || !this.isTournStart){
            return;
        }
        this.isTournStart = false;
        log.info('Tourn STOP');
        clearTimeout(this.timeOutUpdateTourn);
        this.stopGame();
        const winners = Array.from(this.seats).filter(player => player && player.public.sittingIn && player.public.chipsInPlay);
        const prizePath = $u.round(this.public.tournPrize / winners.length);
        if (!(prizePath > 0)){
            return log.error('prizePath isNaN:' + prizePath);
        }
        for (let w in winners){
            const user = await winners[w].getUserDB();
            user.deposit = $u.round(user.deposit + prizePath);
            log.info('Tourn prize: ' + user.login + ' ' + prizePath);
            await user.save();
            $u.updateChipsUserPlayers(user);
        }
        $u.tmpTourn();
        $u.rmCustomTable(this.public.id);
    };
};