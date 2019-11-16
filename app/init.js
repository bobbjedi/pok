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
    console.log({type, text})
    new Noty({
        type,
        text,
        timeout: 3000,
        soundPlayed: true
    }).show();
};
