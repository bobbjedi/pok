import lobbyTemplate from './partials/lobby.html';
import includeHtml from './partials/table-paths';
import config from '../config';
import angular from 'angular';
import _ from 'underscore';
import $u from './libs/utils';
import socket from './directives/socket.io';

window.app = angular.module('app', ['ngRoute']).config(function($routeProvider, $locationProvider) {
    $routeProvider.when('/table-10/:tableId', {
        template: includeHtml(10),
        controller: 'TableController',
    });

    $routeProvider.when('/table-6/:tableId', {
        template: includeHtml(6),
        controller: 'TableController',
    });

    $routeProvider.when('/table-2/:tableId', {
        template: includeHtml(2),
        controller: 'TableController',
    });

    $routeProvider.when('/', {
        template: lobbyTemplate,
        controller: 'LobbyController',
    });

    // $routeProvider.otherwise({ redirectTo: '/' });

    $locationProvider.html5Mode({hash: true});
    // $locationProvider.html5Mode(true).hashPrefix('!');
});

app.run(function($rootScope, $location) {
    $rootScope.logOut = ()=>{
        $rootScope.user = {
            isLogged: false,
            password: '',
            login: null,
            address: '',
            token: false,
            deposit: 0,
            isLoginned: true
        };
    };
    $rootScope.timeOutCurrent = 0;
    setInterval(()=>{
        if ($rootScope.timeOutCurrent > 0){
            $rootScope.$digest();
        }
        $rootScope.timeOutCurrent--;
    }, 1000);
    $rootScope.updateTimeOut = function(){
        $rootScope.timeOutCurrent = config.timeOutWait;
    };

    $rootScope.updateUser = _.throttle(function(needCheck){
        $rootScope.api({action: 'getUser'}, data => {
            Object.assign($rootScope.user, data);
            $rootScope.totalChips = data.deposit;
            needCheck && checkUser();
            $rootScope.$digest();
        }, true);
    }, 2000);

    const checkUser = () => {
        socket.emit ('checkUser', {token: $rootScope.user.token, name: $rootScope.user.login, playerId: $rootScope.playerId}, response => {
            if (response.success){
                $rootScope.playerId = response.playerId;
                console.log($rootScope.playerId);
            }
            else if (response.message) {
                console.log('Error checkUser', response.message);
            }
            $rootScope.$digest();
        });
    };
    $rootScope.checkUser = checkUser;
    window.initSocket(checkUser);

    $rootScope.withdraw = _.throttle(function(amount){
        $rootScope.api({action: 'withdraw', data: {amount}}, data => {
            noty('success', 'Успешно вывели!');
            $rootScope.updateUser();
        });
    }, 1000);

    $rootScope.$watch('user.token', ()=>{
        localStorage.setItem('token', $rootScope.user.token);
    });

    $rootScope.logOut();
    $rootScope.api = api;
    $rootScope.config = config;
    $rootScope.user.token = localStorage.getItem('token');
    $rootScope.totalChips = 0;
    $rootScope.sittingOnTable = '';
    $rootScope.round = $u.round;
    $rootScope.settings = localStorage.getItem('user_settings') && JSON.parse(localStorage.getItem('user_settings')) || {
        cardColors: 'card2',
        sound: true
    };

    $rootScope.updateUser(true);
    window.onbeforeunload = ()=> {
        if (!$rootScope.sittingOnTable && $rootScope.sittingOnTable !== ''){
            return null;
        }
        return true;
    };
    $rootScope.$watch('settings', ()=>{
        localStorage.setItem('user_settings', JSON.stringify($rootScope.settings));
    }, true);
    setInterval(() => {
        $rootScope.updateUser();
    }, 30 * 1000);
    $rootScope.tsp = thousandSeparator;
});


function api(obj, cb = () => {}, silent, type = 'api') {
    obj.data = obj.data || {};
    obj.data.token = type === 'api' && (obj.token || this.user.token);
    fetch(window.Domain + '/' + type + '?action=' + obj.action + '&data=' + JSON.stringify(obj.data))
        .then(res => {
            res.json().then(data => {
                // console.log('Resp:', obj.action + ' -> ', data);
                if (data.success) {
                    cb(data.result);
                } else {
                    console.warn(obj.action + ' error: ', data);
                    if (!silent) {
                        // console.log('NOTT', data.msg);
                        noty('error', data.msg);
                    }
                }
                this.$digest();
            });
        })
        .catch(function (err) {
            console.warn(obj.action, err);
        });
};


const thousandSeparator = num => {
    let fixed = 2;
    if (num > 0.8){
        fixed = 0;
    }
    if (+num === 0 || !num){
        return '0.00';
    }
    var parts = num.toFixed(fixed).split('.'),
        main = parts[0],
        len = main.length,
        output = '',
        i = len - 1;
    while (i >= 0) {
        output = main.charAt(i) + output;
        if ((len - i) % 3 === 0 && i > 0) {
            output = ',' + output;
        }
        --i;
    }
    if (parts.length > 1) {
        output = `${output}.${parts[1]}`;
    }
    return output;
};



(()=>{

    ////////////////////////
    ///////// Настройки
    ////////////////////////
 
    // количество снежинок, которое будет на экране одновременно.
    var snowmax = 40;
 
    // Цвета для снежинок. Для каждой конкретной снежинки цвет выбирается случайно из этого массива.
    var snowcolor = new Array("#b9dff5", "#7fc7ff", "#7fb1ff", "#7fc7ff", "#b9dff5");
 
    // Шрифт для снежинок
    var snowtype = new Array("Times");
 
    // Символ (*) и есть снежинка, в место нее можно вставить любой другой символ.
    var snowletter = "&#10052;";
 
    // Скорость движения снежинок (от 0.3 до 2)
    var sinkspeed = 0.4;
 
    // Максимальный размер для снежинок
    var snowmaxsize = 40;
 
    // Минимальный размер для снежинок
    var snowminsize = 10;
 
    // Зона для снежинок
    // 1 для всей страницы, 2 в левой части страницы
    // 3 в центральной части, 4 в правой части страницы
    var snowingzone = 1;
 
    ////////////////////////
    ///////// Конец настроек
    ////////////////////////
 
    var snow = new Array();
    var marginbottom;
    var marginright;
    var timer;
    var i_snow = 0;
    var x_mv = new Array();
    var crds = new Array();
    var lftrght = new Array();
    var browserinfos = navigator.userAgent;
    var ie5 = document.all && document.getElementById && !browserinfos.match(/Opera/);
    var ns6 = document.getElementById && !document.all;
    var opera = browserinfos.match(/Opera/);
    var browserok = ie5 || ns6 || opera;
    var i;
    function randommaker(range) {
        const rand = Math.floor(range * Math.random());
        return rand;
    }
 

    function movesnow() {
        for (i = 0; i <= snowmax; i++) {
            crds[i] += x_mv[i];
            snow[i].posy += snow[i].sink;
            snow[i].style.left = snow[i].posx + lftrght[i] * Math.sin(crds[i]) + 'px';
            snow[i].style.top = snow[i].posy + 'px';
        
            if (snow[i].posy >= marginbottom - 2 * snow[i].size || parseInt(snow[i].style.left) > (marginright - 3 * lftrght[i])){
                if (snowingzone == 1) {snow[i].posx = randommaker(marginright - snow[i].size);}
                if (snowingzone == 2) {snow[i].posx = randommaker(marginright / 2 - snow[i].size);}
                if (snowingzone == 3) {snow[i].posx = randommaker(marginright / 2 - snow[i].size) + marginright / 4;}
                if (snowingzone == 4) {snow[i].posx = randommaker(marginright / 2 - snow[i].size) + marginright / 2;}
                snow[i].posy = 0;
            }
        }
        timer = setTimeout(movesnow, 50);
    }

    function initsnow() {
        if (ie5 || opera) {
            marginbottom = document.documentElement.clientHeight + 50;
            marginright = document.body.clientWidth - 15;
        }
        else if (ns6) {
            marginbottom = document.documentElement.clientHeight + 50;
            marginright = window.innerWidth - 15;
        }
        var snowsizerange = snowmaxsize - snowminsize;
        for (i = 0; i <= snowmax; i++) {
            crds[i] = 0;
            lftrght[i] = Math.random() * 15;
            x_mv[i] = 0.03 + Math.random() / 10;
            snow[i] = document.getElementById("s" + i);
            snow[i].style.fontFamily = snowtype[randommaker(snowtype.length)];
            snow[i].size = randommaker(snowsizerange) + snowminsize;
            snow[i].style.fontSize = snow[i].size + 'px';
            snow[i].style.color = snowcolor[randommaker(snowcolor.length)];
            snow[i].style.zIndex = 1000;
            snow[i].sink = sinkspeed * snow[i].size / 5;
            if (snowingzone == 1) {snow[i].posx = randommaker(marginright - snow[i].size);}
            if (snowingzone == 2) {snow[i].posx = randommaker(marginright / 2 - snow[i].size);}
            if (snowingzone == 3) {snow[i].posx = randommaker(marginright / 2 - snow[i].size) + marginright / 4;}
            if (snowingzone == 4) {snow[i].posx = randommaker(marginright / 2 - snow[i].size) + marginright / 2;}
            snow[i].posy = randommaker(2 * marginbottom - marginbottom - 2 * snow[i].size);
            snow[i].style.left = snow[i].posx + 'px';
            snow[i].style.top = snow[i].posy + 'px';
        }
        movesnow();
    }

 
    for (i = 0; i <= snowmax; i++) {
        document.body.insertAdjacentHTML('beforeend', "<span id='s" + i + "' style='user-select:none;position:fixed;top:-" + snowmaxsize + "'>" + snowletter + "</span>");
    }
 
    if (browserok) {
        window.onload = initsnow;    
    }

})();
