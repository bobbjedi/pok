import config from '../../config';
import io from '../libs/socket';

const {domain} = config;
window.Domain = domain;
window.socket = io.connect(domain);

window.initSocket = checkUser =>{
    window.socket.on('connect', ()=>{
        console.log('RECCONECT');
        checkUser();
    });
};
