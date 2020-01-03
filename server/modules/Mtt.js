const _ = require('underscore'),
    log = require('../helpers/log'),
    config = require('../helpers/configReader'),
    {tourns} = require('../modules/DB'),
    sng = require('../helpers/utils/sng');

let $u,
    Store;

module.exports = class Mtt{
    constructor(params){
        // return;
        Store = require('../modules/Store');
        $u = require('../helpers/utils');
        this.isStarted = false;
        this.isFinal = false;
        this.params = params;
        this.players = [];
        this.tables = [];
        this.countInTables = {};
        this.offlinePlayersToStart = [];
        this.timeParams = sng();
        this.addedPlayers = [];
        this.init();
        console.log({params});
    }

    async init(){
        this.updateTournParams(); // запускаем рост анте и ББ
        this.db = new tourns({
            timeStart: $u.unix(),
            params: this.params
        }, 1);
        // Собираем игроков
        for (const u of this.params.users){ 
            let isAdded = false;
            for (let i in Store.players){
                const player = Store.players[i];
                if (player.public.name === u && !player.public.sittingIn && !this.addedPlayers.includes(u)){ // онлайн и не за столом
                    this.players.push(player);
                    isAdded = true;
                    log.info('MTT: getOnlinePlayer ' + u);
                    continue;
                }
            }
            if (!isAdded){ // Если играети или занят - создаем клона
                this.players.push(await $u.createOffLinePlayer(u));
                log.warn('MTT: createOffLinePlayer ' + u);
                this.offlinePlayersToStart.push(u);
            }
            this.addedPlayers.push(u);
        }
        this.isStarted = true;
        await this.nextRound(true);
    }
    /**
    * @description рассчитывает количество игроков за каждым столов
    * @returns {Array} массив столов и игроков за ними [5, 5, 5, 4]
    */
    mathTables() {
        let numUsr = this.players.length;
        const {tableSeatsCount} = this.params;
        let countTables = Math.ceil(numUsr / tableSeatsCount);
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
                    callBackPlayersSittingInCountMTT: (a, b, c) => this.callBackPlayersSittingInCountMTT(a, b, c) 
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
                chips: this.params.chips
            };

            const tableId = $u.tmpTourn(data, ' MTT ');
            this.countInTables[tableId] = arrTables[numTbl];
            this.tables.push(tableId); // создали таблицу
            const table = Store.tables[tableId];
            let numPos = 0; // позиция юзера
            while (arrTables[numTbl]-- > 0){ // запихиваем в каждую таблицу юзера
                const player = this.players[--numUsr];
                await $u.wait(0.2);
                log.info('Посадили за #' + numTbl + ' > ' + player.public.name + ' место ' + numPos);
                await table.playerSatOnTheTable(player, numPos++, 0);
                player.room = tableId;
                player.socket.emit('redirectOntable', {link: 'table-' + this.params.tableSeatsCount + '/' + tableId, msg: 'Переход за стол МТТ'});
            }
            if (this.tables.length > 1){ // не последний стол
                // this.params.timeOutShufflePlayers = 1;
                setTimeout(()=> this.stoppedGames(), this.params.timeOutShufflePlayers * 60 * 1000);
            }
            // this.backUpTables = this.tables.slice();
        }
        console.log('this.countInTables', this.countInTables);
    }
    /**
     * @description оповещение о том что игрок в ситауте
     * @param {String} name 
     */
    callBackPlayersSittingInCountMTT(count, tableId, leftInGame){
        log.info('МТТ PlayersSittingInCount ' + count + ' #' + tableId);
        console.log({leftInGame});
        if (this.tables.includes(tableId)){
            this.countInTables[tableId] = count;
        }
        const leftPlayers = this.countPlayersInGame();
        console.log('LEFT IN GAMES:', this.countInTables, leftPlayers);
        if (!this.isFinal && leftPlayers <= this.params.tableSeatsCount){
            log.info(`LEFT ${leftPlayers} players! GO FINAL`);
            this.stoppedGames();
        } else if (this.predLeftPlayers && this.isFinal && (leftPlayers <= this.params.winnersCount) && this.predLeftPlayers !== leftPlayers){
            // TODO: сохранить победителей
            this.db['winners' + leftInGame.length] = leftInGame;
            this.db.save();
        } else if (!this.isFinal && count < 2){ // если стол опустел
            log.info(`LEFT TO TABLE ${count} players! GO NEW TABLES`);
            this.stoppedGames();
        }
        this.predLeftPlayers = leftPlayers;
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
    callBackStoppedRoundMTT(id, table){
        log.info('MTT callBackStoppedRoundMTT: ' + id);
        console.log(' this.tables >', this.tables);
        if (this.isFinal){
            return this.finish(); 
        }
        // TODO: вывесить плашку о переходе
        table && table.emitEvent('waitAllFinishMTTGames');
        delete Store.tables[id];
        var placeInArray = this.tables.indexOf(id);
        if (placeInArray >= 0) {
            this.tables.splice(placeInArray, 1);   
        }
        if (!this.tables.length){
            log.info('MTT все таблицы остановились');
            setTimeout(()=>{
                this.nextRound();
            }, 5000);
        }
    }
    async nextRound(isFirst) {
        let playersLeftChips = null;
        if (!isFirst){
            const players = this.players;
            this.players = [];
            playersLeftChips = {};
            for (const i in players){
                try {
                    const player = players[i];
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
    }
    /**
     * @description Команда на остаовку игр для смены столов 
     */
    stoppedGames (){
        if (!this.isFinal){
            this.tables.forEach(id => Store.tables[id].public.isStoppedGames = true);
        }
    }

    updateTournParams () {
        if (!this.timeParams.length) {
            return;
        }
        const next = this.timeParams.shift();
        this.tables.forEach(id=>{
            const table = Store.tables[id].public;
            table.smallBlind = next.sb;
            table.bigBlind = next.sb * 2;
            table.ante = next.ante;
        });
        this.nextTimeParams = next;
        log.info('MTT updateTournParams: ' + JSON.stringify(next));
        this.timeOutUpdateTourn = setTimeout(()=>{
            this.updateTournParams();
        }, 300 * 1000);
    }

    finish(){
        log.info('FINISH MTT!');
        this.players.forEach(p=>{
            delete Store.players[p.socket.id];
        });
        delete Store.tables[this.tables[0]];
        clearTimeout(this.timeOutUpdateTourn);
    }
};

// setInterval(()=>console.log('1'), 1000)