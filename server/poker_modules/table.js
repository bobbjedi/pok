var Deck = require('./deck'),
    Pot = require('./pot'),
    log = require('../helpers/log'),
    $u = require('../helpers/utils'),
    Store = require('../modules/Store'),
    sng = require('../helpers/utils/sng'),
    fs = require('fs'),
    config = require('../helpers/configReader');


/**
 * The table "class"
 * @param string	id (the table id)
 * @param string	name (the name of the table)
 * @param object 	deck (the deck object that the table will use)
 * @param function 	eventEmitter (function that emits the events to the players of the room)
 * @param int 		seatsCount (the total number of players that can play on the table)
 * @param int 		bigBlind (the current big blind)
 * @param int 		smallBlind (the current smallBlind)
 * @param int 		maxBuyIn (the maximum amount of chips that one can bring to the table)
 * @param int 		minBuyIn (the minimum amount of chips that one can bring to the table)
 * @param bool 		privateTable (flag that shows whether the table will be shown in the lobby)
 */
var Table = function(id, name, eventEmitter, seatsCount, bigBlind, smallBlind, maxBuyIn, minBuyIn, type, privateTable, idCreator, data = {}) {
    data.spin = false;
    // console.log({privateTable, id})
    // The table is not displayed in the lobby
    this.privateTable = privateTable;
    // The number of players who receive cards at the begining of each round
    this.playersSittingInCount = 0;
    // The number of players that currently hold cards in their hands
    this.playersInHandCount = 0;
    // Reference to the last player that will act in the current phase (originally the dealer, unless there are bets in the pot)
    this.lastPlayerToAct = null;
    // The game has begun
    this.gameIsOn = false;
    // The game has only two players
    this.headsUp = false;
    // References to all the player objects in the table, indexed by seat number
    this.seats = [];
    // The deck of the table
    this.deck = new Deck;
    // The function that emits the events of the table
    this.eventEmitter = eventEmitter;
    // The pot with its methods
    this.pot = new Pot(id);
    // таймаут ожидания действия игрока
    this.timeOutWaitUserAction = null;
    // user_id создателя таблицы
    this.idCreator = idCreator;
    // показываем победителей после ривера
    this.isShowDown = false;

    // Tournir data
    this.isTourn = data.isTourn;
    // start tournir;
    this.isTournStart = false;
    // количество победителей в турнире
    this.tournWinnersCount = data.winnersCount || 1;
    // количество для игры
    this.tournPlayersCount = data.playersCount || seatsCount;
    // фишек на старте турнира
    this.tournChips = data.chips;

    this.timeParams = data.isTourn && (data.isMtt && data.mtt.timeParams || sng());

    // История последних раздач
    this.lastGames = [];

    // запоминаем последнюю заявку на действие игрока
    this.lastActiveSetWaitMove = {seat: null, move: null};

    // All the public table data
    this.public = {
        type,
        // The table id
        id: id,
        // The table name
        name: name,
        // The number of the seats of the table
        seatsCount: seatsCount,
        // The number of players that are currently seated
        playersSeatedCount: 0,
        // The big blind amount
        bigBlind: bigBlind,
        // The small blind amount
        smallBlind: smallBlind,
        // The minimum allowed buy in
        minBuyIn: minBuyIn,
        // The maximum allowed buy in
        maxBuyIn: maxBuyIn,
        // The amount of chips that are in the pot
        pot: this.pot.pots,
        // The biggest bet of the table in the current phase
        biggestBet: 0,
        // The seat of the dealer
        dealerSeat: null,
        // The seat of the active player
        activeSeat: null,
        // The public data of the players, indexed by their seats
        seats: [],
        // The phase of the game ('smallBlind', 'bigBlind', 'preflop'... etc)
        phase: null,
        lastWaitPhase: null,
        // The cards on the board
        board: ['', '', '', '', ''],
        // Count games
        gamesCount: 0,
        // bank sum
        allPots: 0,
        // Log of an action, displayed in the chat,
        tournPrize: 0,
        // Места в турнире
        tournSeats: {},
        isTourn: data.isTourn,
        isStoppedGames: false,
        data,
        log: {
            message: '',
            seat: '',
            action: ''
        },
    };
    // Initializing the empty seats
    for (var i = 0; i < this.public.seatsCount; i++) {
        this.seats[i] = null;
    }
    this.setTimeOutRmCustomTbl();
};

require('./tableTourns')(Table);
require('./tablePlayerAct')(Table);

Table.prototype.prepPublicLog = function(){
    this.lastGames.unshift(this.currentGameLog);
    this.lastGames = this.lastGames.splice(0, 50);
    const html = this.lastGames.join('<b>---------------------------------------------------</b><br>');
    fs.writeFile('./public/logs/' + (1 + this.public.id) + '.html', '<body style="background:#1d1b1b;color:burlywood;padding:10;margin:0;">' + html + '</body>', ()=>{});
};

/**
 * @description автодействия на сервере (+3 сек от клиентских)
 */
Table.prototype.setTimeoutWait = function(){
    try {
        const {activeSeat, phase} = this.public;
        this.clearTimeoutPlayerAction('setTimeoutWait');
        if (activeSeat === null || !this.public.seats[activeSeat] || !this.public.seats[activeSeat].name || !phase || this.isWaitMttAnotherTables){
            // console.log('setTimeoutWait Return ', activeSeat === null, !phase, this.isTourn);
            return;
        }

        this.lastWaitPhase = phase;
        this.lastActiveSet = activeSeat;
        const lastActiveUserLogin = activeSeat !== null && this.public.seats[activeSeat].name;

        const autoMoveCb = ()=>{
            try {
                const seat = this.public.seats[activeSeat];
                const currentSeatName = seat && seat.name;
                console.log('autoMoveCb', currentSeatName, lastActiveUserLogin);

                if (currentSeatName === lastActiveUserLogin || this.isWaitMttAnotherTables){
                    const player = this.seats[activeSeat];
                    if (!player){
                        return;
                    }
                    player.public.isDisconnect = true;
                    console.log('Avtomove', player.public.name, phase);
                    if (this.public.phase === 'smallBlind') {
                        this.playerPostedSmallBlind();
                        log.info('Auto SB ' + lastActiveUserLogin);
                    } else if (this.public.phase === 'bigBlind'){
                        this.playerPostedBigBlind();
                        log.info('Auto BB ' + lastActiveUserLogin);
                    } else if (player.public.bet === this.public.biggestBet){
                        log.info('Autocheck ' + lastActiveUserLogin);
                        this.playerChecked();
                    } else {
                        log.info('Autofold ' + player.autoFoldTimes + ' ' + lastActiveUserLogin);
                        this.playerFolded();
                        if (++player.autoFoldTimes > config.maxAutoFoldTimes && !this.isTourn){
                            $u.removePlayer(player.socket);
                            log.info('Высадили (' + player.autoFoldTimes + '): ' + lastActiveUserLogin);
                            return;
                        }
                    }
                    console.log(player.public.name + ' isDisc: ' + player.public.isDisconnect);
                }
            } catch (e){
                console.log(e);
                log.error('Auto moves: ' + e);
            }
        };
        let timeOut = (config.timeOutWait + 3) * 1000;
        if (this.seats[activeSeat].public.isDisconnect || this.public.tournSeats[activeSeat] && this.public.tournSeats[activeSeat].isOut){
            // console.log(lastActiveUserLogin + ' timeOut 3s');
            timeOut = 3000;
        }
        this.timeOutWaitUserAction = setTimeout(autoMoveCb, timeOut);
    } catch (e){
        console.log(e);
        log.error('setTimeOut player:  ' + e);
    }
};
Table.prototype.clearTimeoutPlayerAction = function(src){
    if (this.timeOutWaitUserAction){
        // console.log('clearTimeoutPlayerAction', src);
        clearTimeout(this.timeOutWaitUserAction);
    }
    this.timeOutWaitUserAction = null;
};
// The function that emits the events of the table
Table.prototype.emitEvent = function(eventName, eventData){
    this.eventEmitter(eventName, eventData);
    this.setTimeoutWait();
    this.log({
        message: '',
        action: '',
        seat: '',
        notification: ''
    });
};

/**
 * Finds the next player of a certain status on the table
 * @param  number offset (the seat where search begins)
 * @param  string|array status (the status of the player who should be found)
 * @return number|null
 */
Table.prototype.findNextPlayer = function(offset, status) {
    offset = typeof offset !== 'undefined' ? offset : this.public.activeSeat;
    status = typeof status !== 'undefined' ? status : 'inHand';

    if (status instanceof Array) {
        var statusLength = status.length;
        if (offset !== this.public.seatsCount) {
            for (var i = offset + 1; i < this.public.seatsCount; i++) {
                if (this.seats[i] !== null) {
                    var validStatus = true;
                    for (var j = 0; j < statusLength; j++) {
                        validStatus &= !!this.seats[i].public[status[j]];
                    }
                    if (validStatus) {
                        return i;
                    }
                }
            }
        }
        for (var i = 0; i <= offset; i++) {
            if (this.seats[i] !== null) {
                var validStatus = true;
                for (var j = 0; j < statusLength; j++) {
                    validStatus &= !!this.seats[i].public[status[j]];
                }
                if (validStatus) {
                    return i;
                }
            }
        }
    } else {
        if (offset !== this.public.seatsCount) {
            for (var i = offset + 1; i < this.public.seatsCount; i++) {
                if (this.seats[i] !== null && this.seats[i].public[status]) {
                    return i;
                }
            }
        }
        for (var i = 0; i <= offset; i++) {
            if (this.seats[i] !== null && this.seats[i].public[status]) {
                return i;
            }
        }
    }

    return null;
};

/**
 * Finds the previous player of a certain status on the table
 * @param  number offset (the seat where search begins)
 * @param  string|array status (the status of the player who should be found)
 * @return number|null
 */
Table.prototype.findPreviousPlayer = function(offset, status) {
    offset = typeof offset !== 'undefined' ? offset : this.public.activeSeat;
    status = typeof status !== 'undefined' ? status : 'inHand';

    if (status instanceof Array) {
        var statusLength = status.length;
        if (offset !== 0) {
            for (var i = offset - 1; i >= 0; i--) {
                if (this.seats[i] !== null) {
                    var validStatus = true;
                    for (var j = 0; j < statusLength; j++) {
                        validStatus &= !!this.seats[i].public[status[j]];
                    }
                    if (validStatus) {
                        return i;
                    }
                }
            }
        }
        for (var i = this.public.seatsCount - 1; i >= offset; i--) {
            if (this.seats[i] !== null) {
                var validStatus = true;
                for (var j = 0; j < statusLength; j++) {
                    validStatus &= !!this.seats[i].public[status[j]];
                }
                if (validStatus) {
                    return i;
                }
            }
        }
    } else {
        if (offset !== 0) {
            for (var i = offset - 1; i >= 0; i--) {
                if (this.seats[i] !== null && this.seats[i].public[status]) {
                    return i;
                }
            }
        }
        for (var i = this.public.seatsCount - 1; i >= offset; i--) {
            if (this.seats[i] !== null && this.seats[i].public[status]) {
                return i;
            }
        }
    }

    return null;
};

Table.prototype.initStats = async function() {
    for (var i = 0; i < this.seats.length; i++) {
        const player = this.seats[i];
        if (player){
            await this.stateAction(player, 'games');
        }
    };
};

Table.prototype.stateAction = async function(player, type){
    // console.log(player.public.name, type);
    try {
        const {stat} = player;
        this.seats.forEach(opponent =>{
            if (opponent && opponent.name !== player.public.name){
                const {name} = opponent.public;
                if (name !== player.public.name){
                    stat[type][name] = (player.stat[type][name] || 0) + 1;
                }
            };
        });
        await stat.save();
    } catch (e){
        console.log(e);
        log.error('[Table stateAction]: ' + e);
    }
};

Table.prototype.clearTimeoutRmCustomTbl = function() {
    if (this.timeOutRmTable){
        // console.log('Сбросили удаление кастомной таблицы');
        clearTimeout(this.timeOutRmTable);
        this.timeOutRmTable = null;
    }
};

Table.prototype.setTimeOutRmCustomTbl = async function() {
    if (this.idCreator){
        this.public.creatorName = this.public.creatorName || (await $u.getUserFromQ({_id: this.idCreator}));
        this.clearTimeoutRmCustomTbl();
        // console.log('Задали таймаут');
        this.timeOutRmTable = setTimeout(()=>{
            // console.log('Удалили кастомную таблицу');
            $u.rmCustomTable(this.public.id);
        }, 1000 * 60 * config.tableTimeOutLive);
    }
};

/**
 * Method that starts a new game
 */
Table.prototype.initializeRound = async function(changeDealer) {
    this.lastActiveSetWaitMove = {seat: null, move: null};
    if (Store.isGamesPaused
        || this.public.isStoppedGames // остановка для следующей рассадки турнира
        || this.isTourn && !this.isTournStart && this.playersSittingInCount < this.tournPlayersCount){ //  пока не наполнилось - турнир не стартует

        console.log('initializeRound Stop ID:', this.public.id);
        this.public.activeSeat = null;
        this.emitEvent('table-data', this.public);
        this.public.data.isMtt && this.public.data.mtt.callBackStoppedRoundMTT(this.public.id, this); // оповещаем МТТ об окончании
        this.isWaitMttAnotherTables = true;
        this.clearTimeoutPlayerAction();
        if (!this.isTourn){
            this.emitEvent('noty', {type: 'error', msg: 'Стоп игры!'});
        }

        return;
    }
    const {data} = this.public;

    if (data.isSpin && !data.spin){
        let timeOutStart = $u.unix();
        this.emitEvent('waitSpinRate');
        data.spin = await $u.getSpinRate(this.public.seats);
        this.public.tournPrize = data.spin.rate * this.public.maxBuyIn;
        if (data.spin.isBCH) {
            this.sendChatMsg(`<a  target="blank_" href="https://explorer.minter.network/transactions/${data.spin.hash}">TX hash: ${data.spin.hash.slice(0, 10)}... Mult: x${data.spin.rate}</a>`);
        }
        setTimeout(()=>{
            this.initializeRound(changeDealer);
            this.emitEvent('getSpinRate', data.spin);
        }, 3000 - ($u.unix() - timeOutStart));
        return;
    }
    // this.clearTimeoutPlayerAction('initializeRound');
    this.clearTimeoutRmCustomTbl();
    this.currentGameLog = '<br></br><b>**** ' + log.fullTime() + ' ****</b><br>';
    log.info('[#' + this.public.id + ']' + '<b>**** NEW ROUND! ****</b>');
    changeDealer = typeof changeDealer === 'undefined' ? true : changeDealer;

    if (this.playersSittingInCount > 1) {
        // The game is on now
        this.gameIsOn = true;
        this.public.board = ['', '', '', '', ''];
        this.deck.shuffle();
        // this.headsUp = this.isTourn ? this.playersSittingInCount === this.tournPlayersCount : this.playersSittingInCount === 2;
        this.headsUp = this.playersSittingInCount === 2;
        this.playersInHandCount = 0;
        this.biggestBet = 0;
        this.public.biggestBet = 0;

        for (var i = 0; i < this.public.seatsCount; i++) {
            // If a player is sitting on the current seat
            if (this.seats[i] !== null && this.seats[i].public.sittingIn) {
                if (this.isTournStart){ // анте всем
                    this.pot.pots[0].amount += this.updateTournSeat(i);
                }
                if (!this.seats[i].public.chipsInPlay) {
                    this.seats[i].sitOut(true); // this.seats[seat].sitOut();
                    this.playersSittingInCount--;
                } else {
                    this.currentGameLog += `| ${this.seats[i].public.name}: ${this.seats[i].public.chipsInPlay}`;
                    this.playersInHandCount++;
                    this.seats[i].prepareForNewRound();
                    this.seats[i].stat.gamesCount = (this.seats[i].stat.gamesCount || 0) + 1;
                }
            }
        }
        this.currentGameLog += '<br>';

        // стата!
        this.initStats();

        // Giving the dealer button to a random player
        if (this.public.dealerSeat === null) {
            var randomDealerSeat = Math.ceil(Math.random() * this.playersSittingInCount);
            var playerCounter = 0;
            var i = -1;
            // Assinging the dealer button to the random player
            while (playerCounter !== randomDealerSeat && i < this.public.seatsCount) {
                i++;
                if (this.seats[i] !== null && this.seats[i].public.sittingIn) {
                    playerCounter++;
                }
            }
            this.public.dealerSeat = i;
        } else if (changeDealer || this.seats[this.public.dealerSeat].public.sittingIn === false) {
            // If the dealer should be changed because the game will start with a new player
            // or if the old dealer is sitting out, give the dealer button to the next player
            this.public.dealerSeat = this.findNextPlayer(this.public.dealerSeat);
        }

        this.initializeSmallBlind();
    } else {
        console.log('Stop 426');
        this.tournStop();
    }
};

/**
 * Method that starts the "small blind" round
 */
Table.prototype.initializeSmallBlind = function() {
    // Set the table phase to 'smallBlind'
    this.public.phase = 'smallBlind';

    // If it's a heads up match, the dealer posts the small blind
    if (this.headsUp) {
        this.public.activeSeat = this.public.dealerSeat;
    } else {
        this.public.activeSeat = this.findNextPlayer(this.public.dealerSeat);
    }
    this.lastPlayerToAct = 10;

    // Start asking players to post the small blind
    this.seats[this.public.activeSeat].socket.emit('postSmallBlind');
    this.emitEvent('table-data', this.public, true);
    // this.playerPostedSmallBlind();
};

/**
 * Method that starts the "small blind" round
 */
Table.prototype.initializeBigBlind = function() {
    // Set the table phase to 'bigBlind'
    this.public.phase = 'bigBlind';
    this.actionToNextPlayer();
    // this.playerPostedBigBlind();
};

/**
 * Method that starts the "preflop" round
 */
Table.prototype.initializePreflop = function() {
    // Set the table phase to 'preflop'
    this.public.phase = 'preflop';
    var currentPlayer = this.public.activeSeat;
    // The player that placed the big blind is the last player to act for the round
    this.lastPlayerToAct = this.public.activeSeat;

    for (var i = 0; i < this.playersInHandCount; i++) {
        this.seats[currentPlayer].cards = this.deck.deal(2);
        this.seats[currentPlayer].public.hasCards = true;
        this.seats[currentPlayer].socket.emit('dealingCards', this.seats[currentPlayer].cards);
        currentPlayer = this.findNextPlayer(currentPlayer);
    }

    this.actionToNextPlayer();
};

/**
 * Method that starts the next phase of the round
 */
Table.prototype.initializeNextPhase = function() {
    // this.clearTimeoutPlayerAction('initializeNextPhase');
    switch (this.public.phase) {
    case 'preflop':
        this.public.phase = 'flop';
        this.public.board = this.deck.deal(3).concat(['', '']);
        break;
    case 'flop':
        this.public.phase = 'turn';
        this.public.board[3] = this.deck.deal(1)[0];
        break;
    case 'turn':
        this.public.phase = 'river';
        this.public.board[4] = this.deck.deal(1)[0];
        break;
    }
    log.info('[#' + this.public.id + '] Cards: ' + this.public.board);
    this.currentGameLog += '<b>' + this.public.board + '</b><br>';
    this.pot.addTableBets(this.seats);
    this.public.biggestBet = 0;
    this.public.activeSeat = this.findNextPlayer(this.public.dealerSeat);
    this.lastPlayerToAct = this.findPreviousPlayer(this.public.activeSeat);

    // if (this.isTournStart) {
    //     try {
    //         const {tournSeats} = this.public;
    //         for (let i in tournSeats) {
    //             if (tournSeats[i] && (tournSeats[i].isOut || !this.seats[i] || this.seats[i].public.isDisconnect)) {
    //                 this.updateTournSeat(i);
    //             }
    //         }
    //     } catch (e){
    //         console.log(e);
    //         log.error('updateTournSeat initializeNextPhase' + e);
    //     }
    // }
    this.emitEvent('table-data', this.public, true);

    // If all other players are all in, there should be no actions. Move to the next round.
    if (this.otherPlayersAreAllIn()) {
        var that = this;
        setTimeout(function(){
            that.endPhase();
        }, 1000);
    } else {
        this.seats[this.public.activeSeat].socket.emit('actNotBettedPot');
    }
};

/**
 * The phase when the players show their hands until a winner is found
 */
Table.prototype.showdown = function() {
    if (this.isShowDown){
        return;
    }
    this.clearTimeoutPlayerAction('showdown');
    this.isShowDown = true;
    this.pot.addTableBets(this.seats);

    var currentPlayer = this.findNextPlayer(this.public.dealerSeat);
    var bestHandRating = 0;
    const board = this.public.board.slice();
    for (var i = 0; i < this.playersInHandCount; i++) {
        this.seats[currentPlayer].evaluateHand(this.public.board);
        // If the hand of the current player is the best one yet,
        // he has to show it to the others in order to prove it
        if (this.seats[currentPlayer].evaluatedHand.rating > bestHandRating) {
            this.seats[currentPlayer].public.cards = this.seats[currentPlayer].cards;
        }
        currentPlayer = this.findNextPlayer(currentPlayer);
    }

    const {messages, msgStr} = this.pot.destributeToWinners(this.seats, currentPlayer, board);

    var messagesCount = messages.length;
    for (var i = 0; i < messagesCount; i++) {
        this.sendChatMsg(messages[i]);
    }
    this.sendChatMsg(msgStr);

    this.updateDepsInPlay();
    // ставим таймаут на удаление
    setTimeout(()=>{
        this.isShowDown = false;
        this.endRound(true); // не нужно обновлять
    }, config.timeOutBeforeNewGame * 1000);
};

Table.prototype.sendChatMsg = function(message){
    this.log({
        message,
        action: '',
        seat: '',
        notification: ''
    });
    this.emitEvent('table-data', this.public);
};
/**
 * Ends the current phase of the round
 */
Table.prototype.endPhase = function() {
    // this.clearTimeoutPlayerAction('endPhase');
    switch (this.public.phase) {
    case 'preflop':
    case 'flop':
    case 'turn':
        this.initializeNextPhase();
        break;
    case 'river':
        this.showdown();
        break;
    }
};


/**
 * Making the next player the active one
 */
Table.prototype.actionToNextPlayer = function() {

    this.clearTimeoutPlayerAction('actionToNextPlayer'); // сбрасываем таймер

    this.public.activeSeat = this.findNextPlayer(this.public.activeSeat, ['inHand']);

    switch (this.public.phase) {
    case 'smallBlind':
        this.seats[this.public.activeSeat].socket.emit('postSmallBlind');
        break;
    case 'bigBlind':
        this.seats[this.public.activeSeat].socket.emit('postBigBlind');
        break;
    case 'preflop':
        if (this.otherPlayersAreAllIn()) {
            this.seats[this.public.activeSeat].socket.emit('actOthersAllIn');
            this.lastActiveSetWaitMove = {seat: this.public.activeSeat, move: 'actOthersAllIn'};
        } else {
            this.seats[this.public.activeSeat].socket.emit('actBettedPot');
            this.lastActiveSetWaitMove = {seat: this.public.activeSeat, move: 'actBettedPot'};
        }
        break;
    case 'flop':
    case 'turn':
    case 'river':
        // If someone has betted
        if (this.public.biggestBet) {
            if (this.otherPlayersAreAllIn()) {
                this.seats[this.public.activeSeat].socket.emit('actOthersAllIn');
                this.lastActiveSetWaitMove = {seat: this.public.activeSeat, move: 'actOthersAllIn'};
            } else {
                this.seats[this.public.activeSeat].socket.emit('actBettedPot');
                this.lastActiveSetWaitMove = {seat: this.public.activeSeat, move: 'actBettedPot'};
            }
        } else {
            this.seats[this.public.activeSeat].socket.emit('actNotBettedPot');
            this.lastActiveSetWaitMove = {seat: this.public.activeSeat, move: 'actNotBettedPot'};
        }
        break;
    }
    // this.setTimeoutWait(); // запускаем таймер
    this.emitEvent('table-data', this.public, true);
};


Table.prototype.otherPlayersAreFinish = function() {
    var currentPlayer = this.public.activeSeat;
    var playersAllFinish = 0;
    var isZero = false;
    for (var i = 0; i < this.playersInHandCount; i++) {
        if (this.seats[currentPlayer].public.chipsInPlay === 0) {
            isZero = true;
            console.log('FINISH, BUT 0>>', currentPlayer);
        };

        if (this.seats[currentPlayer].public.chipsInPlay === 0 || this.seats[currentPlayer].public.bet === this.public.biggestBet) {
            playersAllFinish++;
        }
        currentPlayer = this.findNextPlayer(currentPlayer);
    }
    return playersAllFinish >= this.playersInHandCount - 1 && isZero;
};

Table.prototype.otherPlayersAreAllIn = function() {
    // Check if the players are all in
    var currentPlayer = this.public.activeSeat;
    var playersAllIn = 0;
    for (var i = 0; i < this.playersInHandCount; i++) {
        if (this.seats[currentPlayer].public.chipsInPlay === 0) {
            playersAllIn++;
        }
        currentPlayer = this.findNextPlayer(currentPlayer);
    }

    // In this case, all the players are all in. There should be no actions. Move to the next round.
    return playersAllIn >= this.playersInHandCount - 1;
};

/**
 * Method that makes the doubly linked list of players
 */
Table.prototype.removeAllCardsFromPlay = function() {
    // For each seat
    for (var i = 0; i < this.public.seatsCount; i++) {
        // If a player is sitting on the current seat
        if (this.seats[i] !== null) {
            this.seats[i].cards = [];
            this.seats[i].public.hasCards = false;
        }
    }
};

/**
 * Actions that should be taken when the round has ended
 */
Table.prototype.endRound = async function(str) {
    if (this.isShowDown){
        return log.error('[#' + this.public.id + ']: endRound isShowDawn str> ' + str);
    }
    this.clearTimeoutPlayerAction('endRound');
    log.info('[#' + this.public.id + ']: endRound ' + str);
    this.prepPublicLog();
    // ставим таймаут на удаление
    this.setTimeOutRmCustomTbl();
    // If there were any bets, they are added to the pot
    this.pot.addTableBets(this.seats);

    if (!this.pot.isEmpty()) {
        var winnersSeat = this.findNextPlayer(0);
        this.pot.giveToWinner(this.seats[winnersSeat], 763);
    }

    // Sitting out the players who don't have chips
    const leftInGame = []; // для МТТ собираем количество оставшихся в игре
    for (let i = 0; i < this.public.seatsCount; i++) {
        if (this.seats[i] !== null && this.seats[i].public.chipsInPlay <= 0 && this.seats[i].public.sittingIn) {
            this.seats[i].sitOut(true);
            this.playersSittingInCount--;
        } else if (this.seats[i] !== null && this.seats[i].public.chipsInPlay > 0){
            leftInGame.push(this.seats[i].public.name);
        }
    }

    this.public.data.isMtt && this.public.data.mtt.callBackPlayersSittingInCountMTT(this.playersSittingInCount, this.public.id, leftInGame); // оповещаем о количестве
    if (this.isTourn && this.tournWinnersCount >= this.playersSittingInCount){ // завершили турнир!
        this.tournStop();
        return;
    }
    // уже обновлено
    if (str !== true){
        await this.updateDepsInPlay();
    }
    // If there are not enough players to continue the game, stop it
    if (this.playersSittingInCount < 2) {
        this.stopGame();
        this.public.data.isMtt && this.public.data.mtt.callBackStoppedRoundMTT(this.public.id, this); // оповещаем МТТ об окончании
    } else {
        this.initializeRound();
    }
};

/**
 * Method that stops the game
 */
Table.prototype.stopGame = function() {
    this.public.phase = null;
    this.pot.reset();
    this.public.activeSeat = null;
    this.public.board = ['', '', '', '', ''];
    this.public.activeSeat = null;
    this.lastPlayerToAct = null;
    this.removeAllCardsFromPlay();
    this.gameIsOn = false;
    this.emitEvent('gameStopped', this.public);
};

/**
 * Logs the last event
 */
Table.prototype.log = function(log) {
    this.public.log = null;
    this.public.log = log;
};

module.exports = Table;
