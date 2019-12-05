import config from '../../config';
import io from '../libs/socket';

const {domain} = config;
window.Domain = domain;
window.socket = io.connect(domain);

window.initSocket = checkUser =>{
    console.log('init');
    window.socket.on('reconnect', ()=>{
        console.log('RECCONECT');
        checkUser();
    });
};
