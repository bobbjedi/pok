let fs = require('fs');
if (!fs.existsSync('./logs')) {
    fs.mkdirSync('./logs');
}

const creteLogFile = () =>{
    return fs.createWriteStream('./logs/' + date() + '.log', {
        flags: "a"
    });
};

const tablesLog = {

};
let infoStr = creteLogFile();

infoStr.write(`
_________________${fullTime()}_________________

`);

module.exports = {
    error (str) {
        infoStr.write(`
` + 'error|' + fullTime() + '|' + str);
        console.log('\x1b[31m', 'error|' + fullTime(), "\x1b[0m", str);
    },
    info (str) {
        console.log('\x1b[32m', 'info|' + fullTime(), "\x1b[0m", str);

        infoStr.write(`
` + 'info|' + fullTime() + '|' + str);
        if (str.includes('[#')){
            setTableLog(str);
        };
    },
    warn (str) {
        console.log('\x1b[33m', 'warn|' + fullTime(), "\x1b[0m", str);

        infoStr.write(`
		` + 'warn|' + fullTime() + '|' + str);
    },
};

function time () {
    var options = {
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric'
    };

    return new Date().toLocaleString("en", options);
}

function date () {
    var options = {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric'
    };
    return (new Date().toLocaleString("en", options)).replace(/\//g, '-');
}

function fullTime () {
    return `${date()}  ${time()}`;
}

let lastDate = date();

setInterval(() => {
    if (lastDate !== date()){
        console.log('Новый файл логов');
        infoStr = creteLogFile();
    }
}, 60 * 1000);
function setTableLog(str) {
    try {
        const id = str.match(/\[.*?\]/)[0].replace('[#', '_'). replace(']', '');
        if (!tablesLog[id]){
            tablesLog[id] = fs.createWriteStream('./logs/table#' + id + '.log', {
                flags: "a"
            });
        }
        tablesLog[id].write(`
        <i>` + fullTime() + '</i>:' + str);

    } catch (e) {
        console.log('ERROR table log', e);

    }
}
