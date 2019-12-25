const $u = require('../helpers/utils');
const log = require('../helpers/log');

module.exports = Table =>{
/**
 * When a player posts the small blind
 * @param int seat
 */
    Table.prototype.playerPostedSmallBlind = function() {
        var bet = this.seats[this.public.activeSeat].public.chipsInPlay >= this.public.smallBlind ? this.public.smallBlind : this.seats[this.public.activeSeat].public.chipsInPlay;
        this.seats[this.public.activeSeat].bet(bet);
        this.log({
            message: this.seats[this.public.activeSeat].public.name + ' posted the small blind',
            action: 'bet',
            seat: this.public.activeSeat,
            notification: 'Posted blind'
        });

        this.public.biggestBet = this.public.biggestBet < bet ? bet : this.public.biggestBet;
        this.seats[this.public.activeSeat].public.lastAct = 'SBlind';
        this.emitEvent('table-data', this.public);
        this.initializeBigBlind();
    };

    /**
 * When a player posts the big blind
 * @param int seat
 */
    Table.prototype.playerPostedBigBlind = function() {
        var bet = this.seats[this.public.activeSeat].public.chipsInPlay >= this.public.bigBlind ? this.public.bigBlind : this.seats[this.public.activeSeat].public.chipsInPlay;
        this.seats[this.public.activeSeat].bet(bet);
        this.log({
            message: this.seats[this.public.activeSeat].public.name + ' posted the big blind',
            action: 'bet',
            seat: this.public.activeSeat,
            notification: 'Posted blind'
        });
        this.public.biggestBet = this.public.biggestBet < bet ? bet : this.public.biggestBet;
        this.seats[this.public.activeSeat].public.lastAct = 'BBlind';
        this.emitEvent('table-data', this.public);
        this.initializePreflop();
    };

    /**
     * Checks if the round should continue after a player has folded
    */
    Table.prototype.playerFolded = function() {
        this.stateAction(this.seats[this.public.activeSeat], 'fold');
        this.seats[this.public.activeSeat].fold();
        this.log({
            message: this.seats[this.public.activeSeat].public.name + ' folded',
            action: 'fold',
            seat: this.public.activeSeat,
            notification: 'Fold'
        });
        this.seats[this.public.activeSeat].public.lastAct = 'Fold';
        this.emitEvent('table-data', this.public);

        this.playersInHandCount--;
        this.pot.removePlayer(this.public.activeSeat);
        if (this.playersInHandCount <= 1) {
            this.pot.addTableBets(this.seats);
            var winnersSeat = this.findNextPlayer();
            const message = this.pot.giveToWinner(this.seats[winnersSeat]);
            this.log({
                message,
                action: '',
                seat: '',
                notification: ''
            });
            this.endRound(68);
        } else {
            if (this.lastPlayerToAct === this.public.activeSeat) {
                this.endPhase();
            } else {
                this.actionToNextPlayer();
            }
        }
        // this.clearTimeoutPlayerAction('playerFolded');
    };



    /**
 * When a player checks
 */
    Table.prototype.playerChecked = function() {
        this.stateAction(this.seats[this.public.activeSeat], 'check');
        this.seats[this.public.activeSeat].public.lastAct = 'Check';
        this.log({
            message: this.seats[this.public.activeSeat].public.name + ' checked',
            action: 'check',
            seat: this.public.activeSeat,
            notification: 'Check'
        });

        this.emitEvent('table-data', this.public);
        if (this.lastPlayerToAct === this.public.activeSeat) {
            this.endPhase();
        } else {
            this.actionToNextPlayer();
        }
    };

    /**
 * When a player calls
 */
    Table.prototype.playerCalled = function() {
        this.stateAction(this.seats[this.public.activeSeat], 'call');
        var calledAmount = this.public.biggestBet - this.seats[this.public.activeSeat].public.bet;
        this.seats[this.public.activeSeat].bet(calledAmount);
        this.seats[this.public.activeSeat].public.lastAct = 'Call';
        this.log({
            message: this.seats[this.public.activeSeat].public.name + ' called',
            action: 'call',
            seat: this.public.activeSeat,
            notification: 'Call'
        });

        this.emitEvent('table-data', this.public);

        // if (this.lastPlayerToAct === this.public.activeSeat || this.otherPlayersAreAllIn('pact!')) {
        if (this.lastPlayerToAct === this.public.activeSeat) {
            this.endPhase();
        } else {
            this.actionToNextPlayer();
        }
    };

    /**
 * When a player bets
 */
    Table.prototype.playerBetted = function(amount) {
        this.stateAction(this.seats[this.public.activeSeat], 'bet');
        this.seats[this.public.activeSeat].bet(amount);
        this.public.biggestBet = this.public.biggestBet < this.seats[this.public.activeSeat].public.bet ? this.seats[this.public.activeSeat].public.bet : this.public.biggestBet;

        this.log({
            message: this.seats[this.public.activeSeat].public.name + ' betted ' + amount,
            action: 'bet',
            seat: this.public.activeSeat,
            notification: 'Bet ' + $u.round(amount)
        });
        this.seats[this.public.activeSeat].public.lastAct = 'Bet';
        this.emitEvent('table-data', this.public);

        var previousPlayerSeat = this.findPreviousPlayer();
        if (previousPlayerSeat === this.public.activeSeat) {
            this.endPhase();
        } else {
            this.lastPlayerToAct = previousPlayerSeat;
            // console.log('Betted this.lastPlayerToAct', this.seats[previousPlayerSeat].public.name, this.seats[previousPlayerSeat].public.chipsInPlay);
            this.actionToNextPlayer();
        }
    };

    /**
 * When a player raises
 */
    Table.prototype.playerRaised = function(amount) {
        this.stateAction(this.seats[this.public.activeSeat], 'raise');
        this.seats[this.public.activeSeat].raise(amount);
        var oldBiggestBet = this.public.biggestBet;
        this.public.biggestBet = this.public.biggestBet < this.seats[this.public.activeSeat].public.bet ? this.seats[this.public.activeSeat].public.bet : this.public.biggestBet;
        var raiseAmount = this.public.biggestBet - oldBiggestBet;
        this.log({
            message: this.seats[this.public.activeSeat].public.name + ' raised to ' + this.public.biggestBet,
            action: 'raise',
            seat: this.public.activeSeat,
            notification: 'Raise ' + $u.round(raiseAmount)
        });
        this.seats[this.public.activeSeat].public.lastAct = 'Raise';
        this.emitEvent('table-data', this.public);

        var previousPlayerSeat = this.findPreviousPlayer();
        // this.findNextPlayer(this.public.activeSeat, ['chipsInPlay', 'inHand']);
        if (previousPlayerSeat === this.public.activeSeat) {
            this.endPhase();
        } else {
            this.lastPlayerToAct = previousPlayerSeat;
            // console.log('Raised this.lastPlayerToAct', this.seats[previousPlayerSeat].public.name, this.seats[previousPlayerSeat].public.chipsInPlay);
            this.actionToNextPlayer();
        }
    };

    /**
 * Adds the player to the table
 * @param object 	player
 * @param int 		seat
 */
    Table.prototype.playerSatOnTheTable = async function(player, seat, chips) {
        this.seats[seat] = player;
        this.public.seats[seat] = player.public;
        await this.seats[seat].sitOnTable(this.public.id, seat, chips);

        // Increase the counters of the table
        this.public.playersSeatedCount++;
        this.playerSatIn(seat);
    };

    /**
 * Adds a player who is sitting on the table, to the game
 * @param int seat
 */
    Table.prototype.playerSatIn = async function(seat) {
        this.log({
            message: this.seats[seat].public.name + ' sat in',
            action: '',
            seat: '',
            notification: ''
        });
        this.emitEvent('table-data', this.public);

        // The player is sitting in
        this.seats[seat].public.sittingIn = true;
        this.playersSittingInCount++;

        this.emitEvent('table-data', this.public);

        // If there are no players playing right now, try to initialize a game with the new player
        if (!this.gameIsOn && this.playersSittingInCount > (this.isTourn && (this.tournPlayersCount - 1) || 1)) {
        // Initialize the game
            await this.tournStart();
            this.initializeRound(false);
        }
    };


    Table.prototype.allPlayersLeft = function () {
        for (let seat in this.seats) {
            if (this.seats[seat]) {
                this.playerLeft(seat);
            }
        }
    };

    /**
 * Changes the data of the table when a player leaves
 * @param int seat
 */
    Table.prototype.playerLeft = function(seat) {
        try {
            this.log({
                message: this.seats[seat].public.name + ' left',
                action: '',
                seat: '',
                notification: ''
            });

            // If someone is really sitting on that seat
            if (this.seats[seat].public.name) {
                var nextAction = '';

                // If the player is sitting in, make them sit out first
                if (this.seats[seat].public.sittingIn) {
                    this.playerSatOut(seat, true);
                }

                // если турнир - обновляем данные по фишкам в остатке при удалении игрока
                const {tournSeats} = this.public;
                if (this.isTournStart && tournSeats[seat]){
                    tournSeats[seat].chipsInPlay = this.seats[seat].public.chipsInPlay - this.public.ante;
                    tournSeats[seat].isOut = true;
                }

                this.seats[seat].leaveTable();

                // Empty the seat
                this.public.seats[seat] = {};
                this.public.playersSeatedCount--;

                // If there are not enough players to continue the game
                if (this.public.playersSeatedCount < 2) {
                    this.public.dealerSeat = null;
                    // проверяем - вдруг последний isDisconnected
                    const lastPlayer = Array.from(this.seats).find(s=>s);
                    if (lastPlayer && lastPlayer.public.isDisconnect){
                        setTimeout(()=> $u.removePlayer(lastPlayer.socket), 2000);
                    }
                }

                this.seats[seat] = null;
                this.emitEvent('table-data', this.public);

                // If a player left a heads-up match and there are people waiting to play, start a new round
                if (this.playersInHandCount < 2) {
                    this.endRound(277);
                }
                // Else if the player was the last to act in this phase, end the phase
                else if (this.lastPlayerToAct === seat && this.public.activeSeat === seat) {
                    this.endPhase();
                }
            }
        } catch (e){
            console.log(e);
            log.error('TABLE playerLeft' + e);
        }
    };

    // Обновление депозитов
    Table.prototype.updateDepsInPlay = function(){
        for (let i = 0; i < this.public.seatsCount; i++) {
            this.seats[i] && this.seats[i].updateDepInPlay();
        }
    };


    /**
 * Changes the data of the table when a player sits out
 * @param int 	seat 			(the numeber of the seat)
 * @param bool 	playerLeft		(flag that shows that the player actually left the table)
 */
    Table.prototype.playerSatOut = function(seat, playerLeft) {
    // Set the playerLeft parameter to false if it's not specified
        if (typeof playerLeft === 'undefined') {
            playerLeft = false;
        }

        // If the player didn't leave, log the action as "player sat out"
        if (!playerLeft) {
            this.log({
                message: this.seats[seat].public.name + ' sat out',
                action: '',
                seat: '',
                notification: ''
            });
            this.emitEvent('table-data', this.public);
        }

        // If the player had betted, add the bets to the pot
        if (this.seats[seat].public.bet) {
            this.pot.addPlayersBets(this.seats[seat]);
        }     
        console.log({seat, isShowDown: this.isShowDown}, this.public.activeSeat);
        this.pot.removePlayer(seat);

        var nextAction = '';
        this.playersSittingInCount--;

        if (this.seats[seat].public.inHand && !this.isShowDown) { // вылетел во время игры
            console.log(':>', 331);
            this.seats[seat].sitOut();
            this.playersInHandCount--;

            if (this.playersInHandCount < 2) {
                if (!playerLeft) {
                    this.endRound(333);
                }
            } else {
            // If the player was not the last player to act but they were the player who should act in this round
                if (this.public.activeSeat === seat && this.lastPlayerToAct !== seat) {
                    this.actionToNextPlayer();
                }
                // If the player was the last player to act and they left when they had to act
                else if (this.lastPlayerToAct === seat && this.public.activeSeat === seat) {
                    if (!playerLeft) {
                        this.endPhase();
                    }
                }
                // If the player was the last to act but not the player who should act
                else if (this.lastPlayerToAct === seat) {
                    this.lastPlayerToAct = this.findPreviousPlayer(this.lastPlayerToAct);
                }
            }
        } else {
            this.seats[seat].sitOut();
        }
        this.emitEvent('table-data', this.public);
    };
};
