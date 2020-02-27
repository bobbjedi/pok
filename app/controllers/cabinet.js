import $u from '../libs/utils';
import socket from '../services/socket.io';
import app from '../app';

app.controller('CabinetController', ['$scope', '$rootScope', '$http', '$routeParams', '$timeout', 'sounds', '$location', '$sce',
    function ($scope, $rootScope, $http, $routeParams, $timeout, sounds, $location, $sce) {
        $scope.txs = [];
        window.showPreloader();
        setTimeout(() => window.hidePreloader(), 1000);
        $rootScope.api({ action: 'getUserTxs' }, txs => {
            txs.sort((a, b) => b.unix - a.unix);
            $scope.txs = txs;
        });
    }]);