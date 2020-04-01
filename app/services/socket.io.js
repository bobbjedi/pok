import config from '../../config';

// import io from '../libs/socket';

const {domain} = config; 
// window.Domain = location.protocol === 'file:' ? 'http://poker.cr-games.club' : '';
// window.Domain = location.protocol === 'file:' ? 'http://localhost:3000' : '';
window.Domain = domain;

const socket = window.io.connect(window.Domain);

window.refreshSocket = checkUser =>{
    socket.removeAllListeners();
    socket.emit('forceDisconnect', checkUser);
};

window.listeningRedirect = () =>{
    socket.on('redirectOntable', data =>{
        if (location.hash === '#!/' + data.link){
            return;
        }

        window.showPreloader();
        noty('success', data.msg || 'Авто переход за активный стол!');
        location.assign(location.origin + '/#!/' + data.link);
        setTimeout(window.hidePreloader, 1500);
    });
    
    socket.on('noty', data => noty(data.type || 'info', data.msg || 'Ждем окончания игр на всех столах!', 5000));
};

export default socket;


// import ss from 'socket.io-stream';
// import getUserMedia from 'get-user-media-promise';
// import MicrophoneStream from 'microphone-stream';


// note: for iOS Safari, the constructor must be called in response to a tap, or else the AudioContext will remain
// suspended and will not provide any audio data.


// get Buffers (Essentially a Uint8Array DataView of the same Float32 values)


// or pipe it to another stream
// micStream.pipe(/*...*/);

// // It also emits a format event with various details (frequency, channels, etc)
// micStream.on('format', function(format) {
//     console.log(format);
// });

// // Stop when ready
// document.getElementById('my-stop-button').onclick = function() {
//     micStream.stop();
// };


// window.createStream = () => {

//     getUserMedia({ video: false, audio: true }).then(stream => {
//         var micStream = new MicrophoneStream({stream});
// micStream.on('data', function(chunk) {
// Optionally convert the Buffer back into a Float32Array
// (This actually just creates a new DataView - the underlying audio data is not copied or modified.)
// var raw = MicrophoneStream.toRaw(chunk);
//...
// console.log({ chunk });
// note: if you set options.objectMode=true, the `data` event will output AudioBuffers instead of Buffers
// });   
// micStream.on('data', function(chunk) {
//     // Optionally convert the Buffer back into a Float32Array
//     // (This actually just creates a new DataView - the underlying audio data is not copied or modified.)
//     var raw = MicrophoneStream.toRaw(chunk);
//     //...
        
//     // note: if you set options.objectMode=true, the `data` event will output AudioBuffers instead of Buffers
// });
        
// const aCtx = new AudioContext()
// const analyser = aCtx.createAnalyser()
// const microphone = aCtx.createMediaStreamSource(stream)
// microphone.connect(analyser);
// analyser.connect(aCtx.destination);
// var streamIO = ss.createStream();
// console.log({ streamIO });
// console.log({ stream });
// ss(socket).emit('createStream', stream, {name: 'xyz'});
//     console.log(micStream);
// }).catch(err => {
//     console.error("Error getting audio stream from getUserMedia", err);
// });

// ss(socket).emit('createStream', stream, {name: 'xyz'});
// var stream = ss.createStream();
// console.log({ stream });

// };