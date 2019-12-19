import config from '../../config';
import io from '../libs/socket';

const {domain} = config;
// window.Domain = domain;
window.Domain = domain;
const socket = io.connect(domain);

window.refreshSocket = checkUser =>{
    // socket.removeAllListeners();
    // socket.emit('forceDisconnect', ()=>{
    //     checkUser();
    // });
    socket.disconnect();
    setTimeout(()=>{
        socket.connect();
        checkUser();
    }, 500);
};

window.initSocket = checkUser =>{ 
    // console.log('init');

    // let socketConnectTimeInterval;

    // window.socket.on('disconnect', function() {
    //     console.log('DISCONNECT');
    //     socketConnectTimeInterval = setInterval(function () {
    //         window.socket.connect();
    //     }, 1000);
    // });

    // window.socket.on('connect', ()=>{
    //     console.log('CONNECT');
    //     clearInterval(socketConnectTimeInterval);
    //     socketConnectTimeInterval = null;
    //     checkUser();
    // });
};

export default socket;

window.disconnect = ()=>socket.disconnect();
window.connect = ()=>socket.connect();
