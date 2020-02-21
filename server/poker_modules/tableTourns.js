const $u = require('../helpers/utils');
const log = require('../helpers/log');

module.exports = Table =>{
    Table.prototype.updateTournParams = function () {
        if (!this.timeParams.length || this.public.data.isMtt && this.public.ante) { // Если МТТ - то будет общий рост анте, локально не нужно
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
        log.info('Start turn table');
        this.timeOutUpdateTournParams();
        this.public.tournPrize = this.public.minBuyIn * this.tournPlayersCount;
        this.isTournStart = true;
        this.public.isTournStart = true;

        for (let i = 0; i < this.public.seatsCount; i++){
            const s = this.seats[i];
            if (!this.seats[i]){
                continue;
            }
            this.public.tournSeats[i] = {name: s.public.name, chipsInPlay: 0};
            s.public.chipsInPlay = 0;
            await s.updateDepInPlay();

            if (this.public.data.isMtt && this.public.data.mtt.playersLeftChips){ // остатки фишек
                s.public.chipsInPlay = this.public.data.mtt.playersLeftChips[s.public.name];
                console.log('Left cheaps:', s.public.name, '>', s.public.chipsInPlay);
            } else {
                s.public.chipsInPlay = this.tournChips;
            }

            s.chips = 0;
            s.isTourn = true; // определяем что в турнире
            // log.info('in Tourn: ' + s.public.name);
        };
    };

    Table.prototype.tournStop = async function(){
        try {
            if (!this.isTourn || !this.isTournStart){
                return;
            }
            this.isTournStart = false;
            log.info('Tourn STOP');
            clearTimeout(this.timeOutUpdateTourn);
            this.stopGame();
            const winners = Array.from(this.seats).filter(player => player && player.public.sittingIn && player.public.chipsInPlay);
            const prizePath = this.public.data.isMtt ? 0.00001 : $u.round(this.public.tournPrize / winners.length);
            if (!(prizePath > 0)){
                return log.error('prizePath isNaN:' + prizePath);
            }
            for (let w in winners){
                const user = await winners[w].getUserDB();
                await $u.updateUserDeposit(user, prizePath, winners[w].public.coinName);
                log.info('Tourn prize: ' + user.login + ' ' + prizePath);
                // $u.updateChipsUserPlayers(user, winners[w].coinName);
            }

            // удаляем трупов
            const {tournSeats} = this.public;
            for (let i in this.seats) {
                if (tournSeats[i] && (
                    // tournSeats[i].isOut ||
                    !this.seats[i] || this.seats[i].public.isDisconnect)) {
                    const player = this.seats[i];
                    if (player){
                        $u.removePlayer(player.socket);
                        log.info('Удалил турнирный труп: ' + player.public.name);
                    }
                }
            }

            if (!this.public.data.isOnce) {
                $u.tmpTourn(this.public.data);
            }
            $u.rmCustomTable(this.public.id);
            if (this.public.data.mtt && this.public.data.mtt.isFinalTable){
                log.info('MTT FINAL in sng!');
                this.public.data.mtt.callBackStoppedRoundMTT && this.public.data.mtt.callBackStoppedRoundMTT(); // оповещаем МТТ об окончании
            }
        } catch (e){
            console.log(e);
            log.error('tournStop' + e);
        }
    };

    Table.prototype.updateTournSeat = function(seat, amount){
        const player = this.seats[seat];
        if (!player){
            log.error('updateTournSeat is not player: ', seat);
            return;
        }
        amount = amount || this.public.ante;
        const playerChipsInPlay = player.public.chipsInPlay;
        const toPot = Math.min(player.public.chipsInPlay, amount);
        const chipsInPlay = $u.round(playerChipsInPlay - amount);
        if (chipsInPlay > 0){
            player.public.chipsInPlay = chipsInPlay;
        } else {
            player.public.chipsInPlay = 0;
        }
        console.log('ANTE:', {name: player.public.name, seat, amount});
        // if (player.public.chipsInPlay > 0){
        //     player.public.chipsInPlay = tournSeats[seat].chipsInPlay;
        //     console.log('ANTE:', {name: player.public.name, seat, amount});
        //     if (player.public.chipsInPlay < 0){
        //         player.public.chipsInPlay = tournSeats[seat].chipsInPlay = 0;
        //     }
        // }


        return toPot;
    };
};
