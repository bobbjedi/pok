import table10 from './partials/table-10-handed.html';
import table6 from './partials/table-6-handed.html';
import table2 from './partials/table-2-handed.html';
import lobbyTemplate from './partials/lobby.html';
import config from '../config';
import angular from 'angular';
import _ from 'underscore';

window.app = angular.module('app', ['ngRoute']).config(function($routeProvider, $locationProvider) {
    $routeProvider.when('/table-10/:tableId', {
        template: table10,
        controller: 'TableController',
    });

    $routeProvider.when('/table-6/:tableId', {
        template: table6,
        controller: 'TableController',
    });

    $routeProvider.when('/table-2/:tableId', {
        template: table2,
        controller: 'TableController',
    });

    $routeProvider.when('/', {
        template: lobbyTemplate,
        controller: 'LobbyController',
    });

    $routeProvider.otherwise({ redirectTo: '/' });

    // $locationProvider.html5Mode(true).hashPrefix('!');
});

app.run(function($rootScope, $location) {
    $location.path('/');
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

    $rootScope.api = api;

    $rootScope.$watch('user.token', ()=>{
        localStorage.setItem('token', $rootScope.user.token);
    });

    $rootScope.logOut();
    $rootScope.user.token = localStorage.getItem('token');
    $rootScope.totalChips = 0;
    $rootScope.sittingOnTable = '';
    $rootScope.updateUser();
    window.onbeforeunload = ()=> {
        if (!$rootScope.sittingOnTable && $rootScope.sittingOnTable !== ''){
            return null;
        }
        return true;
    };
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
