import app from '../app';

app.controller('CabinetController', ['$scope', '$rootScope', '$http', '$routeParams', '$timeout', 'sounds', '$location', '$sce',
    function ($scope, $rootScope, $http, $routeParams, $timeout, sounds, $location, $sce) {
        $scope.txs = [];
        $scope.refs = [];
        $scope.totalProfit = 0;
        $scope.fullTime = fullTime;
        $scope.hashShort = h => h.slice(0, 7) + '...' + h.slice(h.length - 7, h.length - 1);
        window.showPreloader();
        setTimeout(() => window.hidePreloader(), 1000);

        const updateTxs = () => {
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
                    if (c.type === 'deposit') {
                        return s - c.amount;
                    } else {
                        return s + c.amount;
                    }
                }, - ($rootScope.user.deposits.BIP + $rootScope.user.depositInGame.BIP));
            });
        };
        const updateRefs = () => {
            $rootScope.api({ action: 'getUserRefs' }, refs => {
                const arr = [];
                Object.keys(refs).forEach(name => {
                    arr.push({ name, bonus: refs[name] });
                });
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
