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