const _ = require('underscore');
const log = require('../helpers/log');
const config = require('../helpers/configReader');

let $u,
    Store;

module.exports = class Mtt{
    constructor(params){
        return;
        Store = require('../modules/Store');
        $u = require('../helpers/utils');
        this.params = params;
        this.players = [];
        this.tables = [];
        this.offlinePlayersToStart = [];
        this.init();
        console.log({params});
    }

    async init(){

        // Собираем игроков
        for (const u of this.params.users){ 
            let isAdded = false;
            for (let i in Store.players){
                const player = Store.players[i];
                if (player.public.name === u && !player.public.sittingIn){ // онлайн и не за столом
                    this.players.push(player);
                    isAdded = true;
                    continue;
                }
            }
            if (!isAdded){ // Если играети или занят - создаем клона
                this.players.push(await $u.createOffLinePlayer(u));
                log.warn('MTT: createOffLinePlayer ' + u);
                this.offlinePlayersToStart.push(u);
            }
        }
        this.nextRound(true);
    }

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
        return arrTables;
    }

    async createTables() {
        const arrTables = this.mathTables();
        let numTbl = arrTables.length; 
        let numUsr = this.players.length;
        this.players = _.shuffle(this.players);
        // Создаем таблицы
        this.tables = []; // сбросили старые
        while (numTbl-- > 0){
            log.info('MTT: Создаем таблицу на ' + arrTables[numTbl]);
            const data = Object.assign(JSON.parse(JSON.stringify(config.sng)), {
                isMtt: true,
                isOnce: true,
                count: this.params.tableSeatsCount,
                playersCount: arrTables[numTbl],
                buyIn: 0,
                winnersCount: -1,
                chips: 1000 // TODO: не забыть про перенос чипов!
            });

            const tableId = $u.tmpTourn(data, ' MTT ');
            this.tables.push(tableId); // создали таблицу
            const table = Store.tables[tableId];
            let numPos = 0; // позиция юзера
            while (arrTables[numTbl]-- > 0){ // запихиваем в каждую таблицу юзера
                const player = this.players[--numUsr];
                await $u.wait(0.5);
                log.info('Посадили за #' + numTbl + ' > ' + player.public.name + ' место ' + numPos);
                table.playerSatOnTheTable(player, numPos++, 0);
            }
        }
    }

    async nextRound(isFirst) {// 
        // проверить игроков на cheapsInGame >= 0
        this.createTables();
    }
};

// setInterval(()=>console.log('1'), 1000)