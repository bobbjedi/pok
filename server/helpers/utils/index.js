const {usersDb, depositsDb} = require('../../modules/DB');
const config = require('../../helpers/configReader');
const sha256 = require('sha256');

module.exports = {
    round(n) {
        return Number(n.toFixed(8));
    },
    unix(){
        return new Date().getTime();
    },
    async getUserFromQ (q) {
        const user = await usersDb.findOne(q);
        return user;
    },

    async createUser(params){
        const user = new usersDb({
            address: params.address,
            login: params.login,
            password: sha256(params.password.toString()),
            deposit: config.regDrop || 0,
            depositInGame: 0
        });
        await user.save();
        if (config.regDrop > 0){
            depositsDb.db.syncInsert({user_id: user._id, amount: config.regDrop, type: 'regdrop'});
        }
        return user;
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
    }
};

module.exports.returnChepsInplay();