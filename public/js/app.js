var socket = io.connect();

var app = angular.module('app', ['ngRoute']).config(function($routeProvider, $locationProvider) {
    $routeProvider.when('/table-10/:tableId', {
        templateUrl: '/partials/table-10-handed.html',
        controller: 'TableController', 
    });

    $routeProvider.when('/table-6/:tableId', {
        templateUrl: '/partials/table-6-handed.html',
        controller: 'TableController', 
    });

    $routeProvider.when('/table-2/:tableId', {
        templateUrl: '/partials/table-2-handed.html',
        controller: 'TableController', 
    });

    $routeProvider.when('/', {
        templateUrl: '/partials/lobby.html',
        controller: 'LobbyController', 
    });

    $routeProvider.otherwise({ redirectTo: '/' });

    $locationProvider.html5Mode(true).hashPrefix('!');
});

app.run(function($rootScope) {

    $rootScope.logOut = ()=>{
        $rootScope.user = {
            isLogged: false,
            password: '',
            login: '',
            address: '',
            token: false,
            deposit: 0
        };
    };

    $rootScope.updateUser = ()=>{
        $rootScope.api({action: 'getUser'}, data => {
            Object.assign($rootScope.user, data);
            $rootScope.totalChips = data.deposit;
            $rootScope.sittingOnTable = '';
        });
    };

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
        if (!$rootScope.sittingOnTable){
            return null;
        }
        return true;
    };
});


function api(obj, cb = () => {}, silent, type = 'api') {
    obj.data = obj.data || {};
    obj.data.token = type === 'api' && (obj.token || this.user.token);
    fetch('/' + type + '?action=' + obj.action + '&data=' + JSON.stringify(obj.data))
        .then(res => {
            res.json().then(data => {
                console.log('Resp:', obj.action + ' -> ', data);
                if (data.success) {
                    cb(data.result);
                } else {
                    console.warn(obj.action + ' error: ', data);
                    if (!silent) {
                        console.log('NOTT', data.msg);
                    }
                }
                this.$digest();
            });
        })
        .catch(function (err) {
            console.warn(obj.action, err);
        });
};