const {usersDb} = require('./modules/DB');

// Коины 
(async () => {
    const coin = 'USDT';
    const users = await usersDb.find({
        $where: function () {
            return this.depositInRoom[coin] === undefined;
        }
    });
    for (const i in users) {
        const u = users[i];
        u.deposits[coin] = 0;
        u.depositInGame[coin] = 0;
        u.depositInRoom[coin] = {};
        await u.save();
        console.log(coin, u.login);
    }
})();