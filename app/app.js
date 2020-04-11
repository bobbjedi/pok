import lobbyTemplate from './partials/lobby.html';
import cabinetTemplate from './partials/cabinet.html';
import includeHtml from './partials/table-paths';
import config from '../config';
import angular from 'angular';
import _ from 'underscore';
import $u from './libs/utils';
import socket from './services/socket.io';
import voiceChat from './services/voiceChat';
import push from './services/firebase';

const app = angular.module('app', ['ngRoute']).config(function($routeProvider, $locationProvider) {
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

    $routeProvider.when('/cabinet', {
        template: cabinetTemplate,
        controller: 'CabinetController',
    });

    // $routeProvider.otherwise({ redirectTo: '/' });

    $locationProvider.html5Mode({hash: true});
    // $locationProvider.html5Mode(true).hashPrefix('!');
});

app.run(function($rootScope) {
    $rootScope.logOut = ()=>{
        $rootScope.user = {
            isLogged: false,
            password: '',
            login: null,
            addresses: {},
            token: false,
            deposits: {},
            isLoginned: true
        };
    };
    $rootScope.timeOutCurrent = 0;
    setInterval(() => {
        requestAnimationFrame(() => {
            if ($rootScope.timeOutCurrent > 0) {
                $rootScope.$digest();
            }
            $rootScope.timeOutCurrent--;
            // $rootScope.secondTimeOutMtt && $rootScope.secondTimeOutMtt();
        });
    }, 1000);
    $rootScope.updateTimeOut = function(){
        $rootScope.timeOutCurrent = config.timeOutWait;
    };

    $rootScope.updateUser = _.throttle(function(needCheck){
        $rootScope.api({action: 'getUser'}, data => {
            Object.assign($rootScope.user, data);
            // $rootScope.totalChips = data.deposits[$rootScope.settings.coinName];
            needCheck && checkUser();
            $rootScope.$digest();
        }, true);
    }, 2000);

    const checkUser = () => {
        socket.emit ('checkUser', {token: $rootScope.user.token, name: $rootScope.user.login, playerId: $rootScope.playerId, coinName: $rootScope.settings.coinName}, response => {
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
    // window.initSocket(checkUser);

    $rootScope.withdraw = _.throttle(function(amount, address){
        console.log({amount, address});
        noty('info', 'Заявка сформирована!');
        $rootScope.api({action: 'withdraw', data: {address, amount, coinName: $rootScope.settings.coinName}}, () => {
            noty('success', 'Успешно вывели!');
            $rootScope.updateUser();
        });
    }, 1000);

    $rootScope.$watch('user.token', ()=> localStorage.setItem('token', $rootScope.user.token));

    $rootScope.logOut();
    $rootScope.api = api;
    $rootScope.config = config;
    $rootScope.user.token = localStorage.getItem('token');
    // $rootScope.totalChips = 0;
    $rootScope.sittingOnTable = '';
    $rootScope.round = $u.round;
    $rootScope.settings = localStorage.getItem('user_settings') && JSON.parse(localStorage.getItem('user_settings')) || {
        cardColors: 'card2',
        sound: true,
        coinName: 'DEMO',
        push: false
    };

    $rootScope.changeCoinName = coinName=>{
        if (!coinName){
            return;
        }
        // $rootScope.totalChips = $rootScope.user.deposits[$rootScope.settings.coinName];
        $rootScope.settings.coinName = coinName;
        try {
            $rootScope.$digest();
        } catch (e) { }
    };
    push($rootScope);// оборачиваем пушами
    $rootScope.$watch('settings.coinName', coinName => socket.emit('changeCoinName', coinName)); // меняем депозит
    $rootScope.updateUser(true);
    $rootScope.depositCps = amount => {
        $rootScope.api({action: 'cpsPay', data: {
            coinName: $rootScope.settings.coinName,
            amount
        }}, data =>{
            window.noty('info', 'Заявка созданы, вы будете перенаправлены на страницу для проведения платежа.');
            setInterval(()=>{
                window.open(data.payUrl, "_blank");
            }, 2000);
        });

    };

    window.onbeforeunload = ()=> {
        if (location.hash.includes('table') && $rootScope.makeReload()){
            return true;
        }
        return null;
    };
    
    $rootScope.$watch('settings', ()=>localStorage.setItem('user_settings', JSON.stringify($rootScope.settings)), true);
    setInterval(() => $rootScope.updateUser(), 30 * 1000);
    $rootScope.tsp = thousandSeparator;
    $rootScope.voiceChat = voiceChat($rootScope);
    window.voice = $rootScope.voiceChat;
});


function api(obj, cb = () => {}, silent, type = 'api') {
    obj.data = obj.data || {};
    obj.data.token = type === 'api' && (obj.token || this.user.token);
    fetch(window.Domain + '/' + type + '?action=' + obj.action + '&data=' + JSON.stringify(obj.data), { mode: 'no-cors'})
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

export default app;

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