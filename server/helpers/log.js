let fs = require('fs');
if (!fs.existsSync('./logs')) {
    fs.mkdirSync('./logs');
}

let infoStr = fs.createWriteStream('./logs/' + date() + '.log', {
    flags: "a"
});

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