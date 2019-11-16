const fs = require('fs');

const sep = __dirname.includes('/') ? '/' : '\\';
const dirs = __dirname.split(sep);
dirs.pop();
dirs.pop();
const dirName = dirs.join(sep);

const configJson = fs.readFileSync(dirName + '/config.js')
    .toString()
    .replace('export default', '')
    .replace(';', '');
const config = eval('(' + configJson + ')');

module.exports = config;
