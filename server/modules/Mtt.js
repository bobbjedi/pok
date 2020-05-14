const _ = require('underscore'),
    log = require('../helpers/log'),
    config = require('../helpers/configReader'),
    {tourns} = require('../modules/DB'),
    sng = require('../helpers/utils/sng');

let $u,
    Store;

module.exports = class Mtt{
    constructor(params){
        Store = require('../modules/Store');
        $u = require('../helpers/utils');
        const self = this;
        this.isStarted = false;
        this.isFinal = false;
        this.params = params;
        this.players = [];
        this.tables = [];
        this.countInTables = {};
        this.offlinePlayersToStart = [];
        this.timeParams = sng();
        this.addedPlayers = [];
        this.id = $u.unix(),
        params.winnersCount = Math.floor(params.users.length / 5);
        this.public = {
            buyIn: params.buyIn,
            tables: {},
            playersUsedRebuy: [], // заюзавшие ребай
            isGamesStopped: true, // игры не стартанули или ждут окончания на столах
            timers: {
                randomPlayers: 0,
                multBlinds: 0
            },
            get unix(){
                return $u.unix();
            },
            get isFinal(){
                return self.isFinal;
            },
            get totalBank(){
                return self.db.params.totalBank;
            },
            get prizes(){
                return self.db.prizes;
            },
            get winnersCount(){
                params.winnersCount = Math.floor(this.countParticipants / 5);
                return params.winnersCount;
            },
            get countParticipants(){
                return self.addedPlayers.length;
            },
            get reEntries(){
                self.db.reEntries;
            },
            get winners(){
                self.db.winners;
            },
            get levelData(){
                return {
                    maxLevelReentry: params.maxLevelReentry,
                    level: self.db.level
                };
            }
        };
        this.init();
        Store.publicMtt = this.public;
        Store.currentMtt = this;
    }

    async init(){
        try {
            this.updateTournParams(); // запускаем рост анте и ББ
            this.db = new tourns({
                timeStart: $u.unix(),
                params: this.params,
                reEntries: {},
                winners: [],
                level: 1
            }, 1);

            // Собираем игроков
            for (const u of this.params.users){
                console.log('Check player MTT: ' + u);
                console.log(u, this.addedPlayers.toString(), this.addedPlayers.includes(u));
                if (this.addedPlayers.includes(u)){
                    return log.error('Уже добавлен в МТТ: ' + u);
                }

                this.addedPlayers.push(u);

                if (this.players.find(p=>p.public.name === u)){
                    return log.error('FIND Уже добавлен в МТТ: ' + u);
                };

                let isAdded = false;
                for (const i in Store.players){
                    const player = Store.players[i];
                    if (player.public.name === u && !player.public.sittingIn){ // онлайн и не за столом
                        this.players.push(player);
                        player.isTourn = true;
                        isAdded = true;
                        log.info('MTT: getOnlinePlayer ' + u);
                        break;
                    }
                }
                if (!isAdded){ // Если играет или занят - создаем клона
                    const player = await $u.createOffLinePlayer(u);
                    player.isTourn = true;
                    this.players.push(player);
                    log.warn('MTT: createOffLinePlayer ' + u);
                    this.offlinePlayersToStart.push(u);
                }
                this.db.reEntries[u] = 1;
            }
            this.isStarted = true;
            await this.nextRound(true);
            this.updateDisconnected();
            this.calcPrizes();
        } catch (e) {
            console.log(e);
            log.error('Catch MTT.init: ' + e);
        }
    }
    /**
    * @description рассчитывает количество игроков за каждым столов
    * @returns {Array} массив столов и игроков за ними [5, 5, 5, 4]
    */
    mathTables() {
        let numUsr = this.players.length;
        const {tableSeatsCount} = this.params;
        const countTables = Math.ceil(numUsr / tableSeatsCount);
        const minCountPlayersFromTable = Math.floor(numUsr / countTables);

        const arrTables = [];
        for (let i = 0; i < countTables; i++){
            arrTables[i] = minCountPlayersFromTable;
            numUsr -= minCountPlayersFromTable;
        }
        // сажаем оставшихся
        let tableNum = 0;
        while (numUsr > 0) {
            arrTables[tableNum++]++;
            numUsr--;
        }
        console.log({ countTables, arrTables });
        if (arrTables.length === 1){
            log.info('Final Table!');
            this.isFinal = true;
        }
        return arrTables;
    }
    /**
    * @description создаем таблици и запихиваем игроков
    */
    async createTables(playersLeftChips = null) {
        try {
            this.public.tables = {};
            const arrTables = this.mathTables();
            let numTbl = arrTables.length;
            let numUsr = this.players.length;
            this.players = _.shuffle(this.players);
            // Создаем таблицы
            this.tables = []; // сбросили старые
            this.countInTables = {};
            while (numTbl-- > 0){
                log.info('MTT: Создаем таблицу на ' + arrTables[numTbl]);
                const data = {
                    mtt: {
                        isFinalTable: this.isFinal,
                        timeParams: JSON.parse(JSON.stringify(this.timeParams)),
                        playersLeftChips, // оставшиеся монеты у игроков,
                        callBackStoppedRoundMTT: id =>this.callBackStoppedRoundMTT(id),
                        callBackPlayersSittingInCountMTT: (a, b, c, d) => this.callBackPlayersSittingInCountMTT(a, b, c, d)
                    },
                    userList: '',
                    isMtt: true,
                    isOnce: true,
                    isTourn: true,
                    count: this.params.tableSeatsCount,
                    playersCount: arrTables[numTbl],
                    buyIn: 0,
                    winnersCount: this.isFinal ? 1 : -1,
                    timeOutMult: this.params.timeOutMult || 5,
                    chips: this.params.chips,
                    coinName: this.params.coinName
                };

                const tableId = $u.tmpTourn(data, ' MTT ');
                this.countInTables[tableId] = arrTables[numTbl];
                this.tables.push(tableId); // создали таблицу
                const table = Store.tables[tableId];
                let numPos = 0; // позиция юзера
                while (arrTables[numTbl]-- > 0){ // запихиваем в каждую таблицу юзера
                    const player = this.players[--numUsr];
                    player.room && player.socket.leave('table-' + player.room);
                    await $u.wait(0.3);
                    log.info('Посадили за #' + numTbl + ' > ' + player.public.name + ' место ' + numPos);
                    await table.playerSatOnTheTable(player, numPos++, 0);
                    player.room = tableId;
                    const link = 'table-' + this.params.tableSeatsCount + '/' + tableId;
                    player.link = link;
                    player.socket.emit('redirectOntable', {link, msg: 'Переход за стол МТТ'});
                }
                this.updatePublcParams({tableId: tableId, status: 'inGame', playersLeftChips});
                if (this.tables.length > 1){ // не последний стол
                    const timeOut = this.params.timeOutShufflePlayers * 60 * 1000;
                    this.updatePublcParams({timeOutShufflePlayers: timeOut});
                    setTimeout(()=> this.stoppedGames(), timeOut);
                }
                if (this.isFinal){
                    setTimeout(()=>Store.tables[this.tables[0]].emitEvent('noty', {type: 'info', msg: 'Финал!'}), 5000);
                }
            // this.backUpTables = this.tables.slice();
            }
            // дозакидываем игроков в глобальный список
            setTimeout(()=>{
                this.public.isGamesStopped = false;
                this.updateGlobalPlayers();
            }, 5 * 1000);
            console.log('this.countInTables', this.countInTables);
        } catch (e) {
            console.log(e);
            log.error('Catch MTT.createTables: ' + e);
        }
    }
    /**
     * @description докидываем в глобальный players игроков из турнира, могли высыпаться
     */
    updateGlobalPlayers(){
        try {
            this.players.forEach(player=>{
                console.log('updateGlobalPlayers:', player.public.name, player.socket.id);
                if (!Store.players[player.socket.id]){
                    log.warn('MTT Резервное добавление: ' + player.public.name);
                    Store.players[player.socket.id] = player;
                    player.socket.emit('redirectOntable', {link: player.link, msg: 'Переход за стол МТТ'});
                }
            });
        } catch (e){
            console.log(e);
            log.error('MTT updateGlobalPlayers: ' + e);
        }
    }
    /**
     * @description оповещение о том что игрок в ситауте
     * @param {String} name
     */
    callBackPlayersSittingInCountMTT(count, tableId, leftInGame, sitOutedPlayers){
        try {
            log.info('МТТ PlayersSittingInCount ' + count + ' #' + tableId);
            console.log({leftInGame, sitOutedPlayers});
            // чистим от удаленных
            this.players.forEach((p, i) => {
                if (sitOutedPlayers.includes(p.public.name)){
                    this.players[i] = null;
                }
            });
            this.players = _.compact(this.players);

            this.updatePublcParams({tableId});
            if (this.tables.includes(tableId)){
                this.countInTables[tableId] = count;
            }
            const leftPlayers = this.countPlayersInGame();
            console.log('LEFT IN GAMES:', this.countInTables, leftPlayers);
            if (!this.isFinal && leftPlayers <= this.params.tableSeatsCount){
                log.info(`LEFT ${leftPlayers} players! GO FINAL`);
                this.stoppedGames();
            } else if (this.predLeftPlayers && this.isFinal && (leftPlayers <= this.params.winnersCount) && this.predLeftPlayers !== leftPlayers) {
                this.db['winners' + leftInGame.length] = leftInGame;
                this.db.save();
            } else if (!this.isFinal && count < 2){ // если стол опустел
                log.info(`LEFT TO TABLE ${count} players! GO NEW TABLES`);
                this.stoppedGames();
            }
            this.predLeftPlayers = leftPlayers;
        } catch (e) {
            console.log(e);
            log.error('Catch callBackPlayersSittingInCountMTT: ' + e);
        }
    }
    /**
     * @description Итоговый подсчет призов и победителей
     */
    async mathPrizesAndRatings(){
        try {
            const db = this.db;
            for (let i = db.prizes.length; i >= 1; i--) {
                const name = _.without(db['winners' + i], ...db['winners' + (i - 1)])[0];
                const prize = db.prizes[i - 1];
                db.winners.push({prize, name});
                const user = await $u.getUserFromQ({login: name});
                await $u.updateUserDeposit(user, prize, this.params.coinName, true);
            }
            db.winners.reverse();
            this.db.save();
        } catch (e) {
            console.log(e);
            log.error('MTT: mathPrizesAndRatings: ' + e);
        }
    }
    countPlayersInGame(){
        let countPlayers = 0;
        for (const id in this.countInTables){

            countPlayers += this.countInTables[id];
        }
        return countPlayers;
    }
    /**
     * @description оповещение о том что таблица закончила играть
     * @param {Number} id
     */
    async callBackStoppedRoundMTT(id){
        try {
            if (id && !Store.tables[id]){
                return;
            }
            this.updatePublcParams({tableId: id, status: 'finished'});
            log.info('MTT callBackStoppedRoundMTT: ' + id);
            console.log(' this.tables >', this.tables);
            if (this.isFinal){
                return this.finish();
            }
            // TODO: вывесить плашку о переходе
            Store.tables[id].emitEvent('noty', {});
            await $u.wait(2);
            delete Store.tables[id];
            var placeInArray = this.tables.indexOf(id);
            if (placeInArray >= 0) {
                this.tables.splice(placeInArray, 1);
            }
            if (!this.tables.length){
                log.info('MTT все таблицы остановились');
                setTimeout(()=>{
                    this.nextRound();
                }, 3000);
            }
        } catch (e) {
            console.log(e);
            log.error('Catch callBackStoppedRoundMTT: ' + e);
        }
    }
    async nextRound(isFirst) {
        try {
            let playersLeftChips = null;
            if (!isFirst){
                const players = this.players;
                this.players = [];
                playersLeftChips = {};
                for (const i in players){
                    try {
                        const player = players[i];
                        player.leaveTable();
                        if (player.public.chipsInPlay >= this.nextTimeParams.sb * 2){
                            this.players.push(player);
                            player.sittingOnTable = false;
                            player.seat = null;
                            playersLeftChips[player.public.name] = player.public.chipsInPlay;
                        } else {
                            console.log('Удалили:' + player.public.name);
                            delete Store.players[player.socket.id];
                        }
                    } catch (e){
                        console.log(e);
                        log.error('MTT nextRound:' + e);
                    }
                }
            }
            await this.createTables(playersLeftChips);
        } catch (e) {
            console.log(e);
            log.error('Catch MTT.nextRound: ' + e);
        }
    }
    /**
     * @description Команда на остаовку игр для смены столов
     */
    stoppedGames (){
        if (!this.isFinal){
            this.tables.forEach(id => Store.tables[id].public.isStoppedGames = true);
            this.public.isGamesStopped = true;
        }
    }
    /**
     * @description Проверяем есть ли игрок с таким ником в турнире во избежание задвоения при реентри
     * @param {String} name - ник проверяемого игрока
     */
    getPlayerByName(name) {
        return this.players.find(p=> p.public.name === name);
    }
    updateTournParams () {
        if (!this.timeParams.length) {
            return;
        }
        try {
            const next = this.timeParams.shift();
            this.tables.forEach(id=>{
                const table = Store.tables[id].public;
                table.smallBlind = next.sb;
                table.bigBlind = next.sb * 2;
                table.ante = next.ante;
            });
            this.nextTimeParams = next;
            log.info('MTT updateTournParams: ' + JSON.stringify(next));
            const timeOut = this.params.timeOutMult * 60 * 1000;
            this.timeOutUpdateTourn = setTimeout(()=> this.updateTournParams(), timeOut);
            this.db.level++;
            this.updatePublcParams({updateTournParams: timeOut});
        } catch (e){
            console.log(e);
            log.error('Catch MTT.updateTournParams: ' + e);
        }

    }

    updatePublcParams(params) {
        try {
            console.log('updatePublcParams', params);
            this.updateGlobalPlayers();
            const publicMtt = this.public;
            const {tableId, status, playersLeftChips, timeOutShufflePlayers, updateTournParams} = params;
            if (tableId) { // обновляем игроков
                let chipsData = false;
                let startChips = false;
                if (status === 'inGame' && !playersLeftChips){
                    startChips = this.params.chips;
                } else if (status === 'inGame' && playersLeftChips){
                    chipsData = playersLeftChips;
                }
                const table = Store.tables[tableId];
                publicMtt.tables[tableId] = publicMtt.tables[tableId] || {};
                const punblicTable = publicMtt.tables[tableId];
                punblicTable.seats = [];
                table.public.seats.forEach(s => {
                    punblicTable.seats.push({
                        name: s.name,
                        chipsInPlay: startChips || chipsData && chipsData[s.name] || s.chipsInPlay,
                        isDisconnect: s.isDisconnect
                    });
                });
                if (status){
                    punblicTable.status = status;
                }
            };
            // таймауты
            if (timeOutShufflePlayers){
                const {timers} = this.public;
                timers.randomPlayers = timeOutShufflePlayers + $u.unix();
            }
            if (updateTournParams){
                const {timers} = this.public;
                timers.multBlinds = updateTournParams + $u.unix();
            }
            this.sendPublicPlayers();
        } catch (e){
            console.log(e);
            log.error('Catch MTT.updatePublcParams: ' + e);
        }
    }
    sendPublicPlayers(){
        this.db.save();
        Store.io.emit('public-mtt', this.public);
    }

    // считаем количество каждому призеру
    calcPrizes(){
        try {
            const prizes = [];
            let {totalBank, winnersCount} = this.public;
            console.log('calcPrizes', {totalBank, winnersCount});
            while (winnersCount > 1){
                const currentPrise = Math.round(totalBank * 0.6);
                prizes.push(currentPrise);
                totalBank -= currentPrise;
                winnersCount--;
            }
            prizes.push(Math.round(totalBank));
            this.db.prizes = prizes;
            this.db.save();
            console.log('PRR', this.db);
        } catch (e){
            console.log(e);
            log.error('calcPrizes: ' + e);
        }
    }

    // добавление игрока
    async rebuyPlayer(player){
        const {publicMtt} = Store;
        const {buyIn} = publicMtt;
        const {name} = player.public;
        const deposit = (await player.getUserDB()).deposits[this.params.coinName];
        const {levelData} = this.public;
        console.log('rebuyPlayer>', {deposit, buyIn});
        if (buyIn > deposit){
            return player.socket.emit('noty', {type: 'error', msg: 'Недостаточно средств! Нужно ' + buyIn + '!'});
        }

        if (this.getPlayerByName(name)){
            log.error('Reentry ' + name + ' Вы уже в турнире!');
            return player.socket.emit('noty', {type: 'error', msg: 'Вы уже в турнире!'});
        }
        if (levelData.level > levelData.maxLevelReentry){
            log.error('Reentry ' + name + ' level > maxLevelReentry', levelData);
            return player.socket.emit('noty', {type: 'error', msg: 'Rentry closed!'});
        }

        // ищем минимальное количесnво за столами
        let minCountPlayers = 11;
        let tableIdMinPlayers = -1;
        for (const id in this.countInTables){
            const count = this.countInTables[id];
            if (minCountPlayers > count){
                minCountPlayers = count;
                tableIdMinPlayers = id;
            }
        }
        console.log('REBUY', name, {tableIdMinPlayers, minCountPlayers, isGamesStopped: this.public.isGamesStopped});
        if (minCountPlayers === this.params.tableSeatsCount || this.public.isGamesStopped){
            log.error('Reentry ' + name + ' Нет свободных мест за столами! Попробуйте позже!');
            return player.socket.emit('noty', {type: 'error', msg: 'Нет свободных мест за столами! Попробуйте позже!'});
        }
        this.players.push(player);
        // Ищем свободное место
        const table = Store.tables[tableIdMinPlayers];
        let place = -1;
        for (const checkedPlace in table.seats){
            if (table.seats[checkedPlace] === null) {
                place = checkedPlace;
                break;
            }
        }
        // Сажаем игрока
        await player.updateDeposit(-buyIn, null, true);
        player.isTourn = true;
        await table.playerSatOnTheTable(player, place, 0);
        player.public.chipsInPlay = this.params.chips;
        player.room = tableIdMinPlayers;
        player.chips = 0;
        this.db.reEntries[name] = this.db.reEntries[name] || 0;
        this.db.reEntries[name]++;
        setTimeout(()=>{
            const link = 'table-' + this.params.tableSeatsCount + '/' + tableIdMinPlayers;
            player.link = link;
            player.socket.emit('redirectOntable', {link, msg: 'Переход за стол МТТ'});
            this.db.params.totalBank += buyIn;
            log.info('REBUY SUCCESS: ' + name);
            Store.io.emit('noty', {type: 'info', msg: `К турниру присоединился ${name}. Банк составляет ${this.db.params.totalBank.toFixed(0)} ${this.params.coinName}!` });
            this.db.save();
            if (!this.addedPlayers.includes(name)){
                console.log('MTT Новый участник: ' + name);
                this.addedPlayers.push(name);
            };
            this.calcPrizes();
        }, 300);
    }
    // Обновляем состояние онлайнов для сводки
    updateDisconnected() {
        this.timeOutUpdateDisconnected = setTimeout(() => {
            try {
                this.tables.forEach(tId => {
                    this.public.tables[tId].seats.forEach(s=>{
                        const player = this.players.find(p => p.public.name === s.name);
                        if (player){
                            s.isDisconnect = player.public.isDisconnect;
                        }
                    });
                });
                this.sendPublicPlayers();
                this.updateDisconnected();
            } catch (e) {
                console.log(e);
                log.error('Catch MTT.updateDisconnected: ' + e);
            }
        }, 5000);
    }

    finish() {
        log.info('FINISH MTT!');
        this.mathPrizesAndRatings();
        this.players.forEach(p => {
            delete Store.players[p.socket.id];
        });
        delete Store.tables[this.tables[0]];
        delete this.players;
        delete this.tables;
        delete Store.currentMtt;
        clearTimeout(this.timeOutUpdateTourn);
        clearTimeout(this.timeOutUpdateDisconnected);
    }
};

// let data = {
//     "prizes": [480, 320, 135],
//     "winners3": ["Mayble", "ulikeme", "Dev"],
//     "winners2": ["Mayble", "Dev"],
//     "winners1": ["Mayble"],
//     "winners0": []
// };
// data.winners = [];
// for (let i = data.prizes.length; i >= 1; i--) {
//     data.winners.push({
//         prize: data.prizes[i - 1],
//         name: _.without(data['winners' + i], ...data['winners' + (i - 1)])[0]
//     });
// }
// data.winners.reverse();
// console.log(data)
setTimeout(async () => {
    if (!config.isDev){
        return;
    }
    // return;
    Store = require('../modules/Store');
    Store.createMtt({tableSeatsCount: 6});
    // Store.system.mtt.users = ['Dev', 'Devi', 'Devs', 'Devt', 'Devisd', 'Devis', 'Devo', 'Devog'];
    Store.system.mtt.users = ['Devi', 'Devs', 'Devt', 'Devisd', 'Devo'];
    // Store.system.mtt.users = ['Devi', 'Devs'];
    Store.system.mtt.chips = 50;
    Store.system.mtt.timeOutShufflePlayers = .2;
    Store.system.mtt.timeOutMult = .2;
    Store.system.mtt.coinName = 'ROUBLE';

    Store.startMtt();
}, 5000);
// setInterval(()=>console.log('1'), 1000)
