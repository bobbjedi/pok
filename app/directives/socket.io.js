import config from '../../config';
import io from '../libs/socket';

const {domain} = config;
// window.Domain = domain;
window.Domain = domain;
window.socket = io.connect(domain);

window.refreshSocket = checkUser =>{
    socket.disconnect();
    setTimeout(()=>socket.connect(), 500);
    checkUser();
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
