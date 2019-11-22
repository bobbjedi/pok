const {usersDb, depositsDb} = require('../../modules/DB');
const config = require('../../helpers/configReader');
const sha256 = require('sha256');
const tablesData = require('../../tablesDefault');


let tables, eventEmitter, Table;
module.exports = {
    round(n) {
        return Number(n.toFixed(2));
    },
    unix(){
        return new Date().getTime();
    },
    async getUserFromQ (q) {
        const user = await usersDb.findOne(q);
        return user;
    },

    async createUser(params){
        const {login, password, address} = params;
        if (!login.length || !password.length || !address.length) {
            return {error: 'Неполные данные.'};
        }
        if (/[A-Za-z]/.test(params.login) && /[А-яф-я]/.test(params.login)){
            return {error: 'Запрещено мешать кириллицу и латиницу.'};
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
            loginLowCase: params.login.toLowerCase(),
            password: sha256(params.password.toString()),
            deposit: config.regDrop || 0,
            depositInGame: 0
        });
        await user.save();
        if (config.regDrop > 0){
            depositsDb.db.syncInsert({user_id: user._id, amount: config.regDrop, type: 'regdrop'});
        }
        return {user};
    },
    // воозвращаем после падения сервера
    async returnChepsInplay(){
        const users = await usersDb.find({depositInGame: {$gt: 0}});
        for (let u in users){
            const user = users[u];
            await user.update({
                deposit: user.deposit + user.depositInGame,
                depositInGame: 0
            }, 1);
        }
    },
    createTables(tables = tables, eventEmitter = eventEmitter, Table = Table){
        tables = tables;
        eventEmitter = eventEmitter;
        Table = Table;
        tablesData.forEach((t, i)=>{
            tables[i] = new Table(i, t.count + ' местный стол', eventEmitter(i), t.count, t.sb * 2, t.sb, t.maxBuyIn || t.sb * 2 * 100, t.sb * 2 * 40, t.type, false);
        });
        // tables[0] = new Table(0, '10-ти местный стол', eventEmitter(0), 10, 2, 1, 200, 40, 'hard', false);
    }
};


(async ()=>{
    const users = await usersDb.find({});
    for (let i in users){
        const u = users[i];
        u.update({loginLowCase: u.login.toLowerCase()}, 1);
        console.log('Change', u.login);
    }
})();
module.exports.returnChepsInplay();