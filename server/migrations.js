const {usersDb} = require('./modules/DB');

// Коины 
(async () => {
    const coin = 'USDT';
    const users = await usersDb.find({
        $where: function () {
            return this.deposits[coin] === undefined;
        }
    });
    for (const i in users) {
        const u = users[i];
        u.deposits[coin] = 0;
        await u.save();
        console.log(coin, u.login);
    }
})();