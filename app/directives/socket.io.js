import config from '../../config';
import io from '../libs/socket';

const {domain} = config; 
// window.Domain = location.protocol === 'file:' ? 'http://poker.cr-games.club' : '';
// window.Domain = location.protocol === 'file:' ? 'http://localhost:3000' : '';
window.Domain = domain;

const socket = io.connect(window.Domain);

window.refreshSocket = checkUser =>{
    socket.removeAllListeners();
    socket.emit('forceDisconnect', ()=>{
        checkUser();
    });
    // socket.disconnect();
    // setTimeout(()=>{
    //     socket.connect();
    //     checkUser();
    // }, 500);
};
window.listeningRedirect = () =>{
    socket.on('redirectOntable', data =>{
        if (location.hash === '#!/' + data.link){
            return;
        }
        noty('success', data.msg || 'Авто переход за активный стол!');
        setTimeout(()=>{
            location.assign(location.origin + '/#!/' + data.link);
        }, 1000);
    });
    
    socket.on('noty', data => noty(data.type || 'info', data.msg || 'Ждем окончания игр на всех столах!', 5000));
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
