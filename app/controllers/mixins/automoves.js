import config from '../../../config';

export default ($scope, $routeParams) =>{
    $scope.isSendActionAuto = false;
    $scope.countAutoMoves = 0;
    $scope.automoves = {
        isCheckFold: false,
        isCall: false,
        isCheck: false,
        isPaused: false,
        reset(){
            $scope.automoves.isCheckFold = false;
            $scope.automoves.isCall = false;
            $scope.automoves.isCheck = false;
        },
        // если мы что-то сделали - возвращаем true
        callback(v){
            requestAnimationFrame(()=>{
                if (!$scope.sittingIn){
                    return;
                }
                const {automoves} = $scope;
                // Автокнопки - чекбоксы

                if (automoves.isCall && !$scope.isSendActionAuto && $scope.showCallButton() && $scope.callAmount() <= $scope.table.bigBlind * 3){
                    $scope.isSendActionAuto = true;
                    console.log('Автоколл чекбокс');
                    noty('info', 'Авто call ' + $scope.callAmount());
                    this.reset();
                    return $scope.call();
                } else if ($scope.showCallButton() && $scope.callAmount() >= $scope.table.bigBlind * 3){
                    automoves.isCall = false;
                }

                if (automoves.isCheck && !$scope.isSendActionAuto && $scope.showCheckButton()){
                    $scope.isSendActionAuto = true;
                    console.log('Авточек чекбокс');
                    noty('info', 'Авто check ');
                    this.reset();
                    return $scope.check();
                }

                if (automoves.isCheckFold && !$scope.isSendActionAuto){
                    if ($scope.showCheckButton()){
                        console.log('Авточек чекбокс');
                        $scope.isSendActionAuto = true;
                        noty('info', 'Авто check');
                        this.reset();
                        return $scope.check();
                    }
                    if ($scope.showFoldButton()){
                        console.log('Автофолд чекбокс');
                        $scope.isSendActionAuto = true;
                        noty('info', 'Авто fold');
                        this.reset();
                        return $scope.fold();
                    }
                }
    
                // Автокнопки каждую секунду
                if ($scope.showBigBlindButton() || $scope.showSmallBlindButton()){
                    return $scope.postBlind(true);
                }
    
                if ($scope.showCallButton() && $scope.callAmount() === 0){ // сходил в алл ин и ждет автокалит 0
                    console.log('Автоколл после аллин');
                    return $scope.call();
                }
                if ($scope.showCheckButton() && $scope.table.seats[$scope.mySeat].chipsInPlay <= 0){
                    console.log('Авточек после аллин');
                    return $scope.check();
                }
    
    
    
                // Конец времени
                if (v !== 1 || $scope.table.activeSeat !== $scope.mySeat){
                    return;
                }
                $scope.countAutoMoves++;
                console.log('countAutoMoves', $scope.countAutoMoves);
                if (!$scope.table.seats[$scope.mySeat].isSitOutMe && $scope.countAutoMoves >= (config.maxClientCountAutoMoves || 3)){
                    $scope.sitOutMe();
                    noty('error', 'AUTO SIT OUT 10 min');
                }
                if ($scope.showCheckButton()){
                    noty('info', 'AUTO CHECK timeout');
                    return $scope.check();
                } else if ($scope.showFoldButton()){
                    noty('info', 'AUTO FOLD timeout');
                    return $scope.fold();
                } else if ($scope.showSitOutButton()){
                    return $scope.postBlind(false);
                } else if ($scope.showLeaveTableButton()){
                    return $scope.leaveTable();
                }
            });
        }
    };
};
