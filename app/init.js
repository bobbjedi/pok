import _ from 'underscore';
import Noty from './libs/noty';
import './libs/fonts';

import 'angular';
import 'angular-route';

import './services/socket.io';
import './app';
import './controllers/lobby';
import './controllers/chat';
import './controllers/table';

import './services/sounds';
import './directives/seat';
import config from '../config';


Noty.overrideDefaults({
    layout: 'topRight',
    theme: 'mint',
    animation: {
        open: 'noty_effects_open',
        close: 'noty_effects_close'
    }
});


window.noty = (type, text, delay) => {
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
window.addEventListener("hashchange", function (e) {
    if (e.oldURL.length > e.newURL.length && e.newURL.endsWith('/#/')) {
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

window.copyAddress = () => {
    window.copy('Mxf8c81cdf545aaea50e1f4fbc7f5b89b98ef92022', 'Адрес для пополнения <i>Mxf8c81cdf545aaea50e1f4fbc7f5b89b98ef92022</i> <b>скопирован</b>.  Переведите на него ' + config.coinName + ' c <u>Вашего</u> кошелька (указанного при регистрации) для пополнения счета.<br><b>ВНИМАНИЕ!</b> пополнять нужно обязательно с ВАШЕГО кошелька!');
};


(() => {
    let isFullScreen = false;

    document.fullscreenEnabled =
        document.fullscreenEnabled ||
        document.mozFullScreenEnabled ||
        document.documentElement.webkitRequestFullScreen;
    //Запустить отображение в полноэкранном режиме
    window.launchFullScreen = () => {
        function requestFullscreen(element) {
            if (element.requestFullscreen) {
                element.requestFullscreen();
            } else if (element.mozRequestFullScreen) {
                element.mozRequestFullScreen();
            } else if (element.webkitRequestFullScreen) {
                element.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
            }
        }

        if (document.fullscreenEnabled) {
            isFullScreen = true;
            requestFullscreen(document.documentElement);
        }
    };

    // Выход из полноэкранного режима

    window.cancelFullscreenCustom = () => {
        isFullScreen = false;
        if (document.cancelFullScreen) {
            document.cancelFullScreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitCancelFullScreen) {
            document.webkitCancelFullScreen();
        }
    };

    window.toggleFullScreen = () => {
        if (isFullScreen) {
            return window.cancelFullscreenCustom();
        }
        window.launchFullScreen();
    };
})();

window.generateRndAvatar = img => {
    const liter = img.src.match(/avatars(.*?)\.jpg/)[1][1];
    if (liter){
        img.src = '/avatars_default/default_' + (liter.toLowerCase().charCodeAt(0) - 96) + '.jpg';
    }
};