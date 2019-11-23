import lobbyTemplate from './partials/lobby.html';
import includeHtml from './partials/table-paths';
import config from '../config';
import angular from 'angular';
import _ from 'underscore';
import $u from './libs/utils';

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
        $rootScope.timeOutCurrent = config.timeOutWait - 3;
    };

    $rootScope.updateUser = _.throttle(function(){
        $rootScope.api({action: 'getUser'}, data => {
            Object.assign($rootScope.user, data);
            $rootScope.totalChips = data.deposit;
            $rootScope.$digest();
        }, true);
    }, 2000);


    $rootScope.withdraw = _.throttle(function(){
        $rootScope.api({action: 'withdraw'}, data => {
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

    $rootScope.updateUser();
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
