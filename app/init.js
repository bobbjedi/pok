import Noty from './libs/noty';
import './libs/fonts';

import 'angular';
import 'angular-route';

import './directives/socket.io';
import './app';
import './controllers/lobby';
import './controllers/chat';
import './controllers/table';

import './services/sounds';
import './directives/seat';


Noty.overrideDefaults({
    layout: 'topRight',
    theme: 'mint',
    animation: {
        open: 'noty_effects_open',
        close: 'noty_effects_close'
    }
});


window.noty = (type, text, delay)=>{
    new Noty({
        type,
        text,
        timeout: delay || 3000,
        soundPlayed: true
    }).show();
};


// if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
//     $u.launchFullScreen();
// }
window.addEventListener("hashchange", function(e) {
    if (e.oldURL.length > e.newURL.length && e.newURL.endsWith('/#/')){
        window.location.reload();
    }
});

window.copy = function (v, msg) {
    var copytext = document.createElement('input');
    copytext.value = v;
    document.body.appendChild(copytext);
    copytext.select();
    document.execCommand('copy');
    document.body.removeChild(copytext);
    window.noty('info', msg || 'Скопировано', 10000);
};

window.copyAddress = ()=>{
    window.copy('Mxf8c81cdf545aaea50e1f4fbc7f5b89b98ef92022', 'Адрес для пополнения <i>Mxf8c81cdf545aaea50e1f4fbc7f5b89b98ef92022</i> <b>скопирован</b>.  Переведите на него ESCAPE c <u>Вашего</u> кошелька для пополнения счета.');
};
