const config = require('../helpers/configReader');
const {syncNedb, modelDb} = require('../helpers/syncNedb');
const Datastore = require('nedb');

module.exports = {
    usersDb: modelDb(syncNedb(new Datastore({
        filename: 'db_/users',
        autoload: true
    }), 10)),

    depositsDb: modelDb(syncNedb(new Datastore({
        filename: 'db_/deposits',
        autoload: true
    }))),

    storeDb: modelDb(syncNedb(new Datastore({
        filename: 'db_/store',
        autoload: true
    }), 10)),

    actionsStatDb: modelDb(syncNedb(new Datastore({
        filename: 'db_/actionStat',
        autoload: true
    }), 5)),

    restorePswdDb: modelDb(syncNedb(new Datastore({
        filename: 'db_/restorePswd',
        autoload: true
    }), 600)),

    tourns: modelDb(syncNedb(new Datastore({
        filename: 'db_/tourns',
        autoload: true
    }), 600)),

    refsBonusDb: modelDb(syncNedb(new Datastore({
        filename: 'db_/refBonus',
        autoload: true
    }), 600)),
};


config.coins.forEach(c=>{
    if (c === 'DEMO'){
        return;
    }
    module.exports['depositsDb_' + c] = modelDb(syncNedb(new Datastore({
        filename: 'db_/deposits_' + c,
        autoload: true
    })));
});