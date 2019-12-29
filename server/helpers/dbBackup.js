const zipdir = require('zip-dir');
const log = require('./log');
const $u = require('./utils');

const save = ()=>{
    const name = $u.unix();
    zipdir('./db_', { saveTo: './dbBackups/' + name + '.zip' }, function (err, buffer) {
        if (err){
            return log.error('ZIPPER: ' + err);
        }
        log.info('dbBackups successfully saved ' + name);
    });
};
save();
setInterval(save, 5 * 3600 * 1000);