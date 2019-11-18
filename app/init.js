import $u from './libs/utils';
import Noty from './libs/noty';
import './libs/fonts';
import './libs/angular.min';
import './libs/angular-route.min';

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
    theme: 'mint',
    animation: {
        open: 'noty_effects_open',
        close: 'noty_effects_close'
    }
});


window.noty = (type, text)=>{
    console.log({type, text});
    new Noty({
        type,
        text,
        timeout: 3000,
        soundPlayed: true
    }).show();
};


// if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
//     $u.launchFullScreen();
// }
// $u.launchFullScreen();
window.addEventListener("hashchange", function(e) {
    if (e.oldURL.length > e.newURL.length && e.newURL.endsWith('/#/')){
        window.location.reload();
    }
});
