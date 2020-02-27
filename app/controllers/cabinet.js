import $u from '../libs/utils';
import socket from '../services/socket.io';
import app from '../app';

app.controller('CabinetController', ['$scope', '$rootScope', '$http', '$routeParams', '$timeout', 'sounds', '$location', '$sce',
    function ($scope, $rootScope, $http, $routeParams, $timeout, sounds, $location, $sce) {
        $scope.txs = [];
        $scope.totalProfit = 0;
        $scope.fullTime = fullTime;
        $scope.hashShort = h => h.slice(0, 7) + '...' + h.slice(h.length - 7, h.length - 1);
        window.showPreloader();
        setTimeout(() => window.hidePreloader(), 1000);
        $rootScope.api({ action: 'getUserTxs' }, txs => {
            txs.sort((a, b) => {
                if (!a.unix) {
                    a.unix = 1;
                }
                if (!b.unix) {
                    b.unix = 1;
                }
                return b.unix - a.unix;
            });
            $scope.txs = txs;
            $scope.totalProfit = txs.reduce((s, c) => {
                if (c.type === 'deposit'){
                    return s - c.amount;
                } else {
                    return s + c.amount; 
                }
            }, $rootScope.user.deposits.BIP - $rootScope.user.depositInGame.BIP);
        });
    }]);


function fullTime(u) {
    var options = {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };

    return new Date(u).toLocaleString("ru", options);
}