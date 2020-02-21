const {usersDb, depositsDb} = require('../../modules/DB');
const config = require('../configReader');
const sha256 = require('sha256');
const tablesData = require('../../tablesDefault');
const request = require('request');
const log = require('../log');
const _ = require('underscore');
const cron = require('../cron');

let Store, minter, players_, tables_, eventEmitter_, Table_, lastTableId = 0;

module.exports = {
    round(n) {
        return Number((n - 0.000001).toFixed(2));
    },
    init(data){
        minter = require('../../modules/minter');
        Store = require('../../modules/Store');
        players_ = data.players;
    },
    getPlayersByUserId(user_id){
        const players = [];
        for (let sId in players_){
            if (players_[sId]._id === user_id){
                players.push(players_[sId]);
            };
        };
        return players;
    },
    unix(){
        return new Date().getTime();
    },
    async wait(sec){
        return new Promise(resolve=>setTimeout(resolve, 1000 * sec));
    },
    async getUserFromQ (q) {
        const user = await usersDb.findOne(q);
        return user;
    },
    async asyncReq(url){
        return new Promise(resolve=>{
            request({url, json: true}, (error, response, body)=>{
                if (error){
                    log.error('async req:' + error);
                    return resolve(null);
                }
                resolve(body);
            });
        });
    },
    /**
     * @description  всем вкладкам обновляем доступный депозит
     */
    updateChipsUserPlayers(user, coinName){
        if (!coinName){
            return log.error('updateChipsUserPlayers NO_coinName: ' + user.login + ': ' + coinName);
        }
        const players = this.getPlayersByUserId(user._id);
        players.forEach(p=> {
            if (p.isTourn || p.public.coinName !== coinName){
                // console.log(user.login, 'В турнире!');
                return;
            }
            p.chips = user.deposits[coinName];
        });
    },
    /**
     * @description  изменяем депозит в ДБ
     */
    async updateUserDeposit(user, amount, coinName, isNoNeedSave){
        // console.log('updateUserDeposit>', amount, coinName, isNoNeedSave);
        if (!coinName){
            return log.error('updateUserDeposit NO_coinName: ' + user.login + ': ' + coinName);
        }
        try {
            if (_.isNumber(amount) && amount !== 0){
                user.deposits[coinName] = this.round(user.deposits[coinName] + amount);
                this.updateChipsUserPlayers(user, coinName); // обновим
                if (!isNoNeedSave){
                    await user.save();
                }
                return;
            }
            log.warn('updateUserDeposit amount isNOtNUMBER: ' + coinName + ' ' + amount);
        } catch (e){
            console.log(e);
            log.error('updateUserDeposit(c): ' + e);
        }
        console.log('updateUserDeposit2>', user, amount, coinName, isNoNeedSave);
    },

    async createUser(params){
        const {login, password} = params;
        if (!login.length || !password.length) {
            return {error: 'Неполные данные.'};
        }
        if (/[A-Za-z]/.test(params.login) && /[А-яф-я]/.test(params.login)){
            return {error: 'Запрещено мешать кириллицу и латиницу.'};
        }
        if (/^.*[^A-zА-яЁё].*$/.test(params.login)){
            return {error: 'Запрещено использовать знаки.'};
        }

        const checkUser = await usersDb.findOne({
            $or: [{login}, {loginLowCase: login.toLowerCase()}]
        });
        if (checkUser){
            return {error: 'Логин или адрес уже занят.'};
        }
        const user = new usersDb({
            addresses: {},
            login: params.login,
            timestamp: this.unix(),
            loginLowCase: params.login.toLowerCase(),
            password: this.createPswd(password),
            deposits: {},
            depositInGame: {},
            depositInRoom: {}, // сколько в какой комнате заюзано
        });
        config.coins.forEach(c => {
            user.deposits[c] = 0;
            user.depositInGame[c] = 0;
            user.depositInRoom[c] = {};
            user.addresses[c] = null;
        });
        user.deposits.DEMO = 1000;

        await user.save();
        if (config.regDrop > 0){
            depositsDb.db.syncInsert({user_id: user._id, amount: config.regDrop, type: 'regdrop'});
        }
        return {user};
    },
    createPswd(password){
        return sha256(password.toString());
    },
    // воозвращаем после падения сервера
    async returnChipsInplay(coinName){
        const users = await usersDb.find({
            $where: function () {
                return this.depositInGame[coinName] > 0;
            }
        });

        for (let u in users){
            const user = users[u];
            log.info('[returnChipsInplay] ' + user.login + ': ' + user.depositInGame[coinName] + ' ' + coinName);
            this.updateUserDeposit(user, user.depositInGame[coinName], coinName, true);
            user.depositInGame[coinName] = 0;
            user.depositInRoom[coinName] = {};
            await user.save();
        }
    },
    createTables(tables = tables_, eventEmitter = eventEmitter_, Table = Table_){
        tables_ = tables;
        eventEmitter_ = eventEmitter;
        Table_ = Table;
        let i = 1;
        config.coins.forEach(coinName =>{
            tablesData.forEach(t=>{
                tables[i] = new Table(i, t.count + ' hand', eventEmitter(i), t.count, t.sb * 2, t.sb, t.maxBuyIn || t.sb * 2 * 100, t.sb * 2 * 40, t.type, false, false, false, coinName);
                lastTableId = i;
                i++;
            });
        });
        // tables[0] = new Table(0, '10-ти местный стол', eventEmitter(0), 10, 2, 1, 200, 40, 'hard', false);
    },
    /**
     * @param {Object} params {name, id(0), count, sb, isPrivat}
     */

    createCustomTable(params, data){// TODO: проверка что еще есть активные комнаты у юзера!
        log.info('Custom room:' + JSON.stringify({params, data}));
        data = data || params.data || {};
        if (!eventEmitter_){
            return log.info('Custom room: is not eventEmitter!!');
        }
        let i;
        if (params.isPrivate){
            i = sha256((new Date().getTime() + Math.random()).toString());
        } else {
            i = ++lastTableId;
        }

        data.userListArray = [];
        if (data.userList && data.userList !== ''){
            data.userList = data.userList.replace('  ', ' ').replace('  ', ' ');
            data.userListArray = data.userList.split(',');
        }
        const maxBuyIn = data.buyIn || params.maxBuyIn || params.sb * 2 * 100;
        const minBuyIn = data.buyIn || params.minBuyIn || params.sb * 2 * 40;

        tables_[i] = new Table_(i, params.name || '', eventEmitter_(i), params.count, params.sb * 2, params.sb, maxBuyIn, minBuyIn, params.type || 'custom', params.isPrivate, params.creator_user_id, data, params.coinName || data.coinName || 'BIP');
        return i;
    },

    rmCustomTable(tableId){ // TODO: удалять комнату eventEmmiter!
        try {
            const table = tables_[tableId];
            table.allPlayersLeft();
            log.info('RM custom table ' + tableId);
            delete tables_[tableId];
        } catch (e){
            console.log(e);
            log.error('rmCustomTable: ' + e);
        }

    },
    tmpTourn(data, name){
        return this.createCustomTable({count: data.count, name: name || data.name || 'Sit-And-GO', sb: 10, type: 'SNG'}, data);
    },
    async createOffLinePlayer(login){
        // var eventEmitter = function(tableId) {
        //     return function (eventName, eventData) {};
        // };
        const Player = require('../../poker_modules/player');
        var socket = {
            id: _.uniqueId('offline_'),
            emit(){},
            leave(){},
        };
        players_[socket.id] = new Player(socket, await this.getUserFromQ({login}));
        players_[socket.id].public.isDisconnect = true;
        return players_[socket.id];
    },
    async playerGoInTourn(user){
        const {mtt} = Store.system;
        const {buyIn, coinName} = mtt;
        if (!mtt.isRegOppened){
            return 'Нет запланированных МТТ турниров!';
        }

        if (user.deposits[coinName] < buyIn){
            return 'Не достаточно средств (необходимо ' + buyIn + ')!';
        }
        if (mtt.users.includes(user.login)){
            return 'Этот пользователь уже зарегистрирован!';
        }
        this.updateUserDeposit(user, -buyIn, coinName);
        mtt.users.push(user.login);
        mtt.totalBank += buyIn;
        await Store.save();
    },
    /**
     * @description добавляет адрес юзеру
     * @param {User} user экземпляр UsersDb
     * @param {Object} params GET
     * @returns {String|false} строка с ошибкой или false в случае удачи
     */
    async addAddressToUser(user, params){
        const {address, coinName} = params;
        if (typeof address !== 'string' || typeof coinName !== 'string' || !config.coins.includes(coinName)){
            log.error('addAddressToUser: Невалидные данные: ' + address + ' ' + coinName);
            return 'Not valid address or coin!';
        }
        if (user.addresses[coinName]){
            log.error('addAddressToUser: Адрес пользователю уже добавлен: ' + address);
            return 'Address already exist!';
        }
        user.addresses[coinName] = address;
        await user.save();
        return false;
    },
    /**
     * Начисляет сумму все юзерам на баланс
     * @param {Array<String>} logins массив логинов
     * @param {Number} amount сумма
     * @param {String} coinName название коина
     *
     */
    async multSendCoins(logins, amount, coinName){
        console.log(logins, amount, coinName);
        if (!coinName){
            return log.error('multSendCoins NO_coinName: ' + coinName);
        }
        try {
            if (!amount){
                log.warn('multSendCoins amoutn = ' + amount);
                return;
            }
            for (const login of logins){
                const user = await this.getUserFromQ({login});
                if (!user){
                    log.error('multSendCoins no find ' + login + ' ' + amount);
                    continue;
                }
                await this.updateUserDeposit(user, amount, coinName);
                log.info('multSendCoins success send ' + login + ' ' + coinName + ' ' + amount);
            }
        } catch (e){
            console.log(e);
            log.error('multSendCoins ' + e);
        }

    },

    async updateDemoChips(){
        const users = await usersDb.find({
            $where: function () {
                return this.deposits.DEMO < 1000;
            }
        });
        log.info('updateDemoChips: ' + users.length);

        for (let u in users){
            const user = users[u];
            user.deposits.DEMO = 1000;
            console.log('Add demo chips ' + user.login);
            await user.save();
        }
    },

    async getSpinRate(seats){
        const names = _.compact(seats).map(p=>p.name).join(', ');
        let value = Math.floor(Math.random() * 10);
        let isBCH = false;
        const hash = await minter.sendTx(config.gameMinterAddress, 0, names);
        if (hash){
            value = +hash.replace(/[^0-9]/g, '')[0];
            isBCH = true;
        }
        // await this.wait(3);
        let rate = 0;
        if (value === 0){
            rate = 5;
        } else if (value <= 5){
            rate = 2;
        } else if (value <= 7){
            rate = 3;
        } else {
            rate = 4;
        }
        console.log({isBCH, value, hash, rate});
        return {
            isBCH,
            rate,
            hash: hash || 'minter api error! Random!'
        };
    }
};

// MIGRATE

setTimeout(async ()=>{
    // const users = await usersDb.find({});
    // for (let i in users){
    //     const u = users[i];
    //     u.address && await u.update({
    //         address: undefined,
    //         addresses: {
    //             BIP: u.address
    //         }
    //     }, 1);
    // let bip = u.depositInGame;
    // u.depositInGame = {};
    // u.depositInRoom = {};
    // for (let coin of config.coins){
    //     u.deposits = u.deposits || {};
    //     u.deposits[coin] = u.deposits[coin] || 0;
    //     u.depositInGame[coin] = 0;
    //     u.depositInRoom[coin] = {};
    // }
    // u.deposits.BIP = u.deposit + bip;
    // u.deposits.DEMO = 1000;
    // u.deposit = undefined;
    //     await u.save();
    // }
}, 500);



cron('1d', module.exports.updateDemoChips);
setTimeout(module.exports.updateDemoChips, 10000);
setTimeout(()=>{
    for (let coin of config.coins){
        module.exports.returnChipsInplay(coin);
    }
}, 7500);


config.coins.forEach(coinName=>{
    setTimeout(()=>{
        console.log({coinName});
        let data = JSON.parse(JSON.stringify(config.sng));
        data.count = 10;
        data.buyIn = 100;
        data.winnersCount = 1;
        data.coinName = coinName;
        module.exports.tmpTourn(data);

        data = JSON.parse(JSON.stringify(config.sng));
        data.count = 6;
        data.buyIn = 100;
        data.winnersCount = 1;
        data.coinName = coinName;
        module.exports.tmpTourn(data);

        data = JSON.parse(JSON.stringify(config.sng));
        data.count = 2;
        data.buyIn = 30;
        data.playersCount = 2;
        data.winnersCount = 1;
        data.coinName = coinName;
        module.exports.tmpTourn(data);


        // SPIN

        const dataSpin = JSON.parse(JSON.stringify(config.sng));
        dataSpin.count = 6;
        dataSpin.playersCount = 3;
        dataSpin.winnersCount = 1;
        dataSpin.chips = 800,
        dataSpin.timeOutMult = 3; // минут
        dataSpin.isSpin = true;
        dataSpin.name = 'SPIN And Go';
        dataSpin.coinName = coinName;

        data = JSON.parse(JSON.stringify(dataSpin));
        data.buyIn = 20;
        module.exports.tmpTourn(data);

        data = JSON.parse(JSON.stringify(dataSpin));
        data.buyIn = 50;
        module.exports.tmpTourn(data);

        data = JSON.parse(JSON.stringify(dataSpin));
        data.buyIn = 100;
        module.exports.tmpTourn(data);

        data = JSON.parse(JSON.stringify(dataSpin));
        data.buyIn = 250;
        module.exports.tmpTourn(data);

    }, 5000);
});


