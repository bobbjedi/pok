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
};
