// https://github.com/nkzawa/socket.io-stream
// https://stackoverflow.com/questions/50607578/voice-chat-between-node-js-and-browser-audio-streams-voip

var ss = require('socket.io-stream');
let globalStream;

module.exports = socket => {
    ss(socket).on('createStream', function (stream, data) {
        console.log('createStream', stream);
        globalStream = stream;
    });

};