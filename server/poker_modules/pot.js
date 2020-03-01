const log = require('../helpers/log');
const config = require('../helpers/configReader');
const $u = require('../helpers/utils');
const Store = require('../modules/Store');
const {refsBonusDb} = require('../modules/DB');

/**
 * The pot object
 */
var Pot = function(tableId) {
    // The pot may be split to several amounts, since not all players
    // have the same money on the table
    // Each portion of the pot has an amount and an array of the
    // contributors (players who have betted in the pot and can
    // win it in the showdown)
    this.tableId = tableId;
    this.pots = [{
        amount: 0,
        contributors: []
    }];
};

/**
   * Method that resets the pot to its initial state
   */
Pot.prototype.reset = function() {
    this.pots.length = 1;
    this.pots[0].amount = 0;
    this.pots[0].contributors = [];
};

/**
   * Method that gets the bets of the players and adds them to the pot
   * @param array players (the array of the tables as it exists in the table)
   */
Pot.prototype.addTableBets = function(players) {
    const tableId = this.tableId;
    // Getting the current pot (the one in which new bets should be added)
    var currentPot = this.pots.length - 1;

    // The smallest bet of the round
    let smallestBet = 0;
    // Flag that shows if all the bets have the same amount
    var allBetsAreEqual = true;

    const table = Store.tables[tableId];
    // Trying to find the smallest bet of the player
    // and if all the bets are equal
    for (var i in players) {
        if (players[i] && players[i].public.bet) {
        // if (players[i] && players[i].public.inHand) {
            if (!smallestBet) {
                smallestBet = players[i].public.bet;
            }
            // eslint-disable-next-line eqeqeq
            else if (players[i].public.bet != smallestBet) {
                allBetsAreEqual = false;

                if (players[i].public.bet < smallestBet) {
                    smallestBet = players[i].public.bet;
                }
            }
        }
    }

    // If all the bets are equal, then remove the bets of the players and add
    // them to the pot as they are
    if (allBetsAreEqual) {
        let isNeedNewPot = false;
        // log.info('[#' + tableId + ']' + ' allBetsAreEqual');
        for (var i in players) {
            // players[i] && log.info('[#' + tableId + '] s' + i + ' palyer bet: ' + players[i].public.bet);
            if (players[i] && players[i].public.bet) {
                const amount = players[i].public.bet;
                this.pots[currentPot].amount += amount;
                players[i].public.bet = 0;
                if (this.pots[currentPot].contributors.indexOf(players[i].seat) < 0) {
                    this.pots[currentPot].contributors.push(players[i].seat);
                    // log.info('[#' + tableId + '] add to contributors to pot#' + currentPot + ' ' + players[i].public.name + ' s:' + ' ' + players[i].seat);
                    // log.info('[#' + tableId + ']' + JSON.stringify(this.pots));
                }
                if (players[i].public.chipsInPlay === 0){
                    isNeedNewPot = players[i].public.name;
                    table.currentGameLog += '<b>' + isNeedNewPot + ' ALL IN ' + amount + '</b><br>';
                    log.info('[#' + tableId + '] all In #' + isNeedNewPot + ' ' + amount);
                }
            }
        }
        if (isNeedNewPot){
            // log.info('[#' + tableId + '] all In new pot');
            this.pots.push({
                amount: 0,
                contributors: []
            });
        }
    } else {
        // If not all the bets are equal, remove from each player's bet the smallest bet
        // amount of the table, add these bets to the pot and then create a new empty pot
        // and recursively add the bets that remained, to the new pot
        for (var i in players) {
            // players[i] && log.info('[#' + tableId + '] s' + i + ' palyer bet: ' + players[i].public.bet);
            if (players[i] && players[i].public.bet) {
                this.pots[currentPot].amount += smallestBet;
                players[i].public.bet = players[i].public.bet - smallestBet;
                if (this.pots[currentPot].contributors.indexOf(players[i].seat) < 0) {
                    this.pots[currentPot].contributors.push(players[i].seat);
                    // log.info('[#' + tableId + '] add to contributors to New pot ' + players[i].public.name + ' s:' + ' ' + players[i].seat);
                    // log.info('[#' + tableId + ']' + JSON.stringify(this.pots));
                }
            }
        }

        // Creating a new pot
        this.pots.push({
            amount: 0,
            contributors: []
        });

        // log.info('[#' + tableId + '] is not equal, create pot#' + this.pots.length);
        // Recursion
        this.addTableBets(players);
    }
    // log.info('[#' + tableId + ']allPots: ' + JSON.stringify(this.pots));
};

/**
   * Adds the player's bets to the pot
   * @param {[type]} player [description]
   */
Pot.prototype.addPlayersBets = function(player) {
    // Getting the current pot (the one in which new bets should be added)
    var currentPot = this.pots.length - 1;
    this.pots[currentPot].amount += player.public.bet;
    player.public.bet = 0;
    // If the player is not in the list of contributors, add them
    if (!this.pots[currentPot].contributors.indexOf(player.seat)) {
        this.pots[currentPot].contributors.push(player.seat);
    }
};

Pot.prototype.destributeToWinners = function(players, firstPlayerToAct, board) {
    const {system} = Store;
    const table = Store.tables && Store.tables[this.tableId] || {public: {}};
    system.totalGamesCount++;
    table.public.gamesCount++;

    var potsCount = this.pots.length;
    var messages = [];
    var messages_ = [];
    var winnersHands = [];

    const tIdstr = '[#' + this.tableId + '] | ';
    const winnersData = {};
    var playersCount = players.length;
    table.currentGameLog += '<b>Game finished</b></br>';
    log.info('[#' + this.tableId + '] *** Game finished **');
    log.info(tIdstr + 'Cards: ' + JSON.stringify(board));
    log.info(tIdstr + 'Pots: ' + JSON.stringify(this.pots));

    for (var j = 0; j < playersCount; j++) {
        if (players[j]) {
            table.currentGameLog += players[j].public.name + ' cards: [' + players[j].cards + '] |';
        }
    };

    table.currentGameLog += '<br>';
    // For each one of the pots, starting from the last one
    for (var i = potsCount - 1; i >= 0; i--) {
        const pot = this.pots[i];
        const isReturn = pot.contributors.length === 1 && !pot.isNotAlone;
        if (!table.isTourn){
            system.totalBankAmount += pot.amount;
            table.public.allPots += pot.amount;
            this.updateStatistic(pot.amount);
        }
        var winners = [];
        var bestRating = 0;
        for (var j = 0; j < playersCount; j++) {
            if (players[j] && players[j].public.inHand && pot.contributors.indexOf(players[j].seat) >= 0) {
                log.info(tIdstr + players[j].public.name + ' cards: [' + players[j].cards + '] ' + ' rating: ' + players[j].evaluatedHand.rating + JSON.stringify(players[j].evaluatedHand));
                if (players[j].evaluatedHand.rating > bestRating) {
                    bestRating = players[j].evaluatedHand.rating;
                    winners = [players[j].seat];
                    log.info(tIdstr + players[j].public.name + ' new best rating');
                }
                else if (players[j].evaluatedHand.rating === bestRating) {
                    log.info(tIdstr + players[j].public.name + ' === best rating');
                    winners.push(players[j].seat);
                }
            }
        }

        log.info(tIdstr + 'Winners для pot:' + JSON.stringify(pot) + ' Winners:' + winners + ' return: ' + isReturn);
        let strGetPrize = isReturn ? ' returned ' : ' win the pot ';
        if (winners.length === 1) {
            const winner = players[winners[0]];
            log.info(tIdstr + 'winner.public.chipsInPlay before: ' + winner.public.chipsInPlay);
            log.info(tIdstr + 's135: ' + winner.public.name + ' #' + winner.seat + ' + ' + pot.amount);
            winner.public.chipsInPlay += pot.amount;
            var htmlHand_ = '[' + winner.evaluatedHand.cards.join(', ') + ']';
            var htmlHand = htmlHand_.replace(/s/g, '&#9824;').replace(/c/g, '&#9827;').replace(/h/g, '&#9829;').replace(/d/g, '&#9830;');
            htmlHand_ = htmlHand;
            if (!isReturn){
                winnersHands.push(winner.evaluatedHand.cards);
            }
            const strWin = winner.public.name + strGetPrize + '(' + pot.amount + ') with ' + winner.evaluatedHand.name + ' ';
            messages.push(strWin + htmlHand);
            messages_.push(strWin + htmlHand_);

            winnersData[winner.public.name] = winnersData[winner.public.name] || {amount: 0, cards: winner.evaluatedHand.name + ' ' + htmlHand_, sId: winner.socket.id};
            winnersData[winner.public.name].amount += pot.amount;
            winnersData[winner.public.name].amount = $u.round(winnersData[winner.public.name].amount);
            winner.roundCheapsInPlay();
        } else {
            var winnersCount = winners.length;

            var winnings = ~~(pot.amount / winnersCount);
            var oddChip = winnings * winnersCount !== pot.amount;

            for (var j in winners) {
                var playersWinnings = 0;
                const jPlayer = players[winners[j]];
                if (oddChip && jPlayer.seat === firstPlayerToAct) {
                    playersWinnings = winnings + 1;
                } else {
                    playersWinnings = winnings;
                }
                if (!isReturn){
                    winnersHands.push(jPlayer.evaluatedHand.cards);
                }
                jPlayer.public.chipsInPlay += playersWinnings;
                log.info(tIdstr + ' s154: ' + jPlayer.public.name + ' #' + winners[j] + ' + ' + playersWinnings);
                var htmlHand_ = '[' + jPlayer.evaluatedHand.cards.join(', ') + ']';
                var htmlHand = htmlHand_.replace(/s/g, '&#9824;').replace(/c/g, '&#9827;').replace(/h/g, '&#9829;').replace(/d/g, '&#9830;');
                htmlHand_ = htmlHand;
                const strWin = jPlayer.public.name + strGetPrize + '(' + playersWinnings + ') with ' + jPlayer.evaluatedHand.name + ' ';
                messages.push(strWin + htmlHand);
                messages_.push(strWin + htmlHand_);

                winnersData[jPlayer.public.name] = winnersData[jPlayer.public.name] || {amount: 0, cards: jPlayer.evaluatedHand.name + ' ' + htmlHand_, sId: jPlayer.socket.id};
                winnersData[jPlayer.public.name].amount += playersWinnings;

                winnersData[jPlayer.public.name].amount = $u.round(winnersData[jPlayer.public.name].amount);
                jPlayer.roundCheapsInPlay();

            }
        }
    }

    this.reset();
    Object.keys(winnersData).forEach(u=>{
        const data = winnersData[u];
        const player = Store.players[data.sId];
        const {totalBet} = player.public;
        const profit = $u.round(data.amount - totalBet);
        mathRake(player, profit);
        system.winners[u] = (system.winners[u] || 0) + data.amount;
        log.info('[#' + this.tableId + '] ' + `${u} выиграл ${data.amount} (${data.cards})`);
        table.currentGameLog += `${u} получил ${data.amount} (${data.cards}) <br>`;
        console.log(u, {win: data.amount, totalBet, profit});
    });
    system.save();
    const msgStr = JSON.stringify({_: '{DATA}', winnersData, winnersHands});
    return {messages, msgStr};
};

/**
   * Method that gives the pot to the winner, if the winner is already known
   * (e.g. everyone has folded)
   * @param object  winner
   */
Pot.prototype.giveToWinner = function(winner, s) {
    console.log('giveToWinner', s);
    var potsCount = this.pots.length;
    var totalAmount = 0;
    const tableId = this.tableId;
    const table = Store.tables[tableId];
    for (var i = potsCount - 1; i >= 0; i--) {
        // log.info('[#' + tableId + '] ' + 's177: ' + winner.public.name + ' #' + winner.seat + ' + ' + this.pots[i].amount);
        winner.public.chipsInPlay += this.pots[i].amount;
        totalAmount += this.pots[i].amount;
    }
    this.updateStatistic(totalAmount);
    const {totalBet} = winner.public;
    const profit = $u.round(totalAmount - totalBet);
    console.log({profit, totalBet, totalAmount});
    mathRake(winner, profit);
    this.reset();
    const msg = winner.public.name + ' wins the pot (' + totalAmount + ')';
    table.sendChatMsg(JSON.stringify({_: '{DATA}', winnersData: {[winner.public.name]: {amount: totalAmount}}}));
    log.info('[#' + tableId + '] ' + msg + ' ' + s);
    table.currentGameLog += msg + '<br>';
    Store.system.save();
};

/**
   * Removing a player from all the pots
   * @param  number   seat
   */
Pot.prototype.removePlayer = function(seat) {
    // log.info('[#' + this.tableId + '] удаляем из потов #' + seat);
    var potsCount = this.pots.length;
    for (var i = 0; i < potsCount; i++) {
        var placeInArray = this.pots[i].contributors.indexOf(seat);
        if (placeInArray >= 0) {
            this.pots[i].contributors.splice(placeInArray, 1);
            this.pots[i].isNotAlone = true; // значит не был один и это не будет возвратом
        }
    }
};


Pot.prototype.updateStatistic = function(amount) {
    try {
        const table = Store.tables && Store.tables[this.tableId] || {public: {}};
        if (!table.isTourn){
            const {system} = Store;
            const {coinName} = table.public;
            const date = log.date();
            system.gamesCount[coinName][date] = (system.gamesCount[coinName][date] || 0) + 1;
            system.gamesValue[coinName][date] = (system.gamesValue[coinName][date] || 0) + amount;
        }
    } catch (e){
        console.log(e);
        log.error('updateStatistic: ' + e);
    }
};
Pot.prototype.isEmpty = function() {
    return !this.pots[0].amount;
};

const arrBetta = ["Dino", "vadim", "goldemva", "Scryaga", "A", "⚡Denik⚡", "SkazochnikVS", "Tolyabasik", "xuikorova", "Alexgen", "Vl_silver", "sonder joy", "BaTpyxA", "Megatuchka", "Vince", "alex", "gnomus", "2z", "yakubenko", "Doc", "Alex", "ammae", "Aaravos", "patrik", "Cash", "Sexy", "Fox", "ZAMOR"];
async function mathRake(player, profit) {
    try {
        if (player.isTourn || arrBetta.includes(player.public.name)){
            console.log('No rake', player.public.name);
            return;
        }
        const {coinName} = player.public;
        const {percent, minProfit, refBonus} = config.rakes[coinName] || {
            percent: 0,
            minProfit: Infinity,
            refBonus: 1
        };
        if (profit < minProfit) {
            console.log('return', {profit, minProfit});
            return;
        }
        const rake = profit / 100 * percent;
        const date = log.date();
        Store.system.rakes[coinName][date] = $u.round((Store.system.rakes[coinName][date] || 0) + rake);
        console.log('RAKE: ', rake, 'TOTAL RAKE:', Store.system.rakes.BIP);
        // return;
        player.public.chipsInPlay -= rake;
        player.roundCheapsInPlay();
        await setRefBonus(player, rake, refBonus, date, coinName);
    } catch (e) {
        console.log(e);
        log.error('mathRake ' + e);
    }
}

/**
 * @description Отправить реф бонус
 * @param {Player} player
 * @param {Number} rake
 */
async function setRefBonus(player, rake, refBonus, date, coinName){
    try {
        const { refererId, login } = (await player.getUserDB());
        if (refererId) {
            const doc = await refsBonusDb.findOne({ refererId }) || new refsBonusDb({ refererId, bonuses: {} });
            const bonus = rake * refBonus;
            doc.bonuses[login] = $u.round((doc.bonuses[login] || 0) + bonus);
            Store.system.refBonus[coinName][date] = $u.round((Store.system.refBonus[coinName][date] || 0) + bonus);
            console.log({ bonus });
            await doc.save();
            await $u.updateUserDeposit(await $u.getUserFromQ({ referalLink: refererId }), bonus, coinName);
            return;

        }
        console.log(player.name + ' нет реферера');
    } catch (e) {
        console.log(e);
        log.error('setRefBonus ' + e);
    }
}
module.exports = Pot;
