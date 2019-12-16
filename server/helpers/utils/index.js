const {usersDb, depositsDb} = require('../../modules/DB');
const config = require('../../helpers/configReader');
const sha256 = require('sha256');
const tablesData = require('../../tablesDefault');
const request = require('request');
const log = require('../log');

let players_, tables_, eventEmitter_, Table_, lastTableId = 0;
module.exports = {
    round(n) {
        return Number((n - 0.000001).toFixed(2));
    },
    init(data){
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
    updateChipsUserPlayers(user){
        const players = this.getPlayersByUserId(user._id);
        players.forEach(p=> {
            if (p.isTourn){
                console.log(user.login, 'В турнире!');
                return;
            }
            p.chips = user.deposit;
        });
    },
    unix(){
        return new Date().getTime();
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
    async createUser(params){
        const {login, password, address} = params;
        if (!login.length || !password.length || !address.length) {
            return {error: 'Неполные данные.'};
        }
        if (/[A-Za-z]/.test(params.login) && /[А-яф-я]/.test(params.login)){
            return {error: 'Запрещено мешать кириллицу и латиницу.'};
        }
        if (/^.*[^A-zА-яЁё].*$/.test(params.login)){
            return {error: 'Запрещено использовать знаки.'};
        }

        const checkUser = await usersDb.findOne({
            $or: [{address}, {login}, {loginLowCase: login.toLowerCase()}]
        });
        if (checkUser){
            return {error: 'Логин или адрес уже занят.'};
        }
        const user = new usersDb({
            address: params.address,
            login: params.login,
            timestamp: this.unix(),
            loginLowCase: params.login.toLowerCase(),
            password: this.createPswd(password),
            deposit: config.regDrop || 0,
            depositInGame: 0,
            depositInRoom: {},
        });
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
    async returnChepsInplay(){
        const users = await usersDb.find({depositInGame: {$gt: 0}});
        for (let u in users){
            const user = users[u];
            log.info('[returnChepsInplay] ' + user.login + ': ' + user.depositInGame);
            await user.update({
                deposit: user.deposit + user.depositInGame,
                depositInGame: 0,
                depositInRoom: {}
            }, 1);
            this.updateChipsUserPlayers(users);
        }
    },
    createTables(tables = tables_, eventEmitter = eventEmitter_, Table = Table_){
        tables_ = tables;
        eventEmitter_ = eventEmitter;
        Table_ = Table;
        tablesData.forEach((t, i)=>{
            tables[i] = new Table(i, t.count + ' местный стол', eventEmitter(i), t.count, t.sb * 2, t.sb, t.maxBuyIn || t.sb * 2 * 100, t.sb * 2 * 40, t.type, false);
            lastTableId = i;
        });
        // tables[0] = new Table(0, '10-ти местный стол', eventEmitter(0), 10, 2, 1, 200, 40, 'hard', false);
    },
    /**
     * @param {Object} params {name, id(0), count, sb, isPrivat}
     */

    createCustomTable(params, data = {}){// TODO: проверка что еще есть активные комнаты у юзера!
        log.info('Custom room:' + JSON.stringify(params));
        if (!eventEmitter_){
            return log.info('Custom room: is not eventEmitter!!');
        }
        let i;
        if (params.isPrivate){
            i = sha256((new Date().getTime() + Math.random()).toString());
        } else {
            i = ++lastTableId;
        }

        const maxBuyIn = data.buyIn || params.maxBuyIn || params.sb * 2 * 100;
        const minBuyIn = data.buyIn || params.minBuyIn || params.sb * 2 * 40;

        tables_[i] = new Table_(i, params.count + '-hands ' + params.name || '', eventEmitter_(i), params.count, params.sb * 2, params.sb, maxBuyIn, minBuyIn, params.type || 'custom', params.isPrivate, params.creator_user_id, data);
        return i;
    },
    rmCustomTable(tableId){ // TODO: удалять комнату eventEmmiter!
        console.log({tableId});
        const table = tables_[tableId];
        table.allPlayersLeft();
        log.info('RM custom table ' + tableId);
        delete tables_[tableId];

    },
    tmpTourn(data){
        this.createCustomTable({count: data.count, name: 'Sit-And-GO', sb: 10, type: 'SNG'}, data);
    }
};


// MIGRATE

// setTimeout(async ()=>{
//     const users = await usersDb.find({});
//     for (let i in users){
//         const u = users[i];
//         u.depositInRoom = {};
//         await u.save();
//     }
// }, 2000);
module.exports.returnChepsInplay();
setTimeout(()=>{
    let data = JSON.parse(JSON.stringify(config.sng));
    data.count = 10;
    data.buyIn = 10;
    data.winnersCount = 3;
    module.exports.tmpTourn(data);

    data.count = 6;
    data.buyIn = 20;
    data.winnersCount = 2;
    module.exports.tmpTourn(data);

    data.count = 2;
    data.buyIn = 30;
    data.winnersCount = 1;
    module.exports.tmpTourn(data);
});

