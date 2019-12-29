const zipdir = require('zip-dir');
const log = require('./log');
const $u = require('./utils');

const save = ()=>{
    zipdir('./db_', { saveTo: './dbBackups/' + $u.unix() + '.zip' }, function (err, buffer) {
        if (err){
            return log.error('ZIPPER: ' + err);
        }
        log.info('dbBackups successfully saved');
    });
};
save();
setInterval(() => {
    
}, 5 * 3600 * 1000);