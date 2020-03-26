import app from '../app';
import config from '../../config';

app.controller('CabinetController', ['$scope', '$rootScope', '$http', '$routeParams', '$timeout', 'sounds', '$location', '$sce',
    function ($scope, $rootScope, $http, $routeParams, $timeout, sounds, $location, $sce) {
        $scope.txs = [];
        $scope.refs = [];
        $scope.totalProfit = 0;
        $scope.fullTime = fullTime;
        $scope.coinList = config.coins;
        $scope.hashShort = h => h.slice(0, 7) + '...' + h.slice(h.length - 7, h.length - 1);
        window.showPreloader();
        setTimeout(() => window.hidePreloader(), 1000);

        const updateTxs = () => {
            $rootScope.api({ action: 'getUserTxs' }, txs => {
                const {coinName} = $scope;
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
                    if (c.type === 'deposit') {
                        return s - c.amount;
                    } else {
                        return s + c.amount;
                    }
                }, - ($rootScope.user.deposits[coinName] + $rootScope.user.depositInGame[coinName]));
            });
        };
        const updateRefs = () => {
            $rootScope.api({ action: 'getUserRefs' }, refs => {
                const {coinName} = $scope;
                const arr = [];
                Object.keys(refs).forEach(name => arr.push({ name, bonus: refs[name][coinName]}));
                $scope.refs = arr;
            });
        };
        if ($rootScope.user.login) {
            updateTxs();
            updateRefs();
        }

        $rootScope.$watch('user.login', ()=>{
            updateTxs();
            updateRefs();
        });

        $rootScope.$watch('settings.coinName', v =>{
            $scope.coinName = v;
            updateTxs();
            updateRefs();
        });
    }]);


function fullTime(u) {
    var options = {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        // second: '2-digit'
    };

    return new Date(u).toLocaleString("ru", options);
}
