import sounds from '../../services/sounds';
import socket from '../../services/socket.io';
import $u from '../../libs/utils';

export default ($scope, $rootScope) => {
    $rootScope.normaliseSeconds = $u.normaliseSeconds;
    // SPIN
    $scope.isShowTournModal = false;
    $scope.isWaitSpinRate = false;
    $scope.spin = { rate: 0, hash: '' };

    $scope.showSpinRateDice = () => {
        sounds.playDicesSound();
        $scope.isWaitSpinRate = true;
    };
    $scope.showSpinRateValue = (data) => {
        $scope.spin = data;
        setTimeout(() => $scope.isWaitSpinRate = false, 0);
        // $scope.isWaitSpinRate = false;
    };

    $scope.$watch('table.data.isMtt', isMtt => {
        if (isMtt) {
            socket.on('public-mtt', data => {
                $scope.publicMtt = data;
                concatPlayers();
            });
            socket.emit('get-public-mtt', data => {
                $scope.publicMtt = data;
                concatPlayers();
            });
            // $rootScope.secondTimeOutMtt = ()=>{
            //     $scope.publicMtt.timerShufflePlayers--;
            //     $scope.publicMtt.multBlinds--;
            // };
        } else {
            $rootScope.secondTimeOutMtt = null;
            $scope.publicMtt = null;
            // socket.removeListener('public-mtt');
        }
    });

    const concatPlayers = () => {
        const { publicMtt } = $scope;
        if (!publicMtt) {
            return;
        }
        const playersList = [];
        publicMtt.countOffline = 0;
        publicMtt.countOnline = 0;
        publicMtt.timerShufflePlayers = (publicMtt.timers.randomPlayers - publicMtt.unix) / 1000;
        publicMtt.timerMultBlinds = (publicMtt.timers.multBlinds - publicMtt.unix) / 1000;
        for (const tId in publicMtt.tables) {
            publicMtt.tables[tId].seats.forEach(p => {
                if (p.name && p.chipsInPlay > 0) {
                    playersList.push(p);
                    p.isDisconnect ? publicMtt.countOffline++ : publicMtt.countOnline++;
                }
            });
        }
        playersList.sort((a, b) => b.chipsInPlay - a.chipsInPlay);
        publicMtt.playersList = playersList;
    };
};
