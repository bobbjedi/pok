import sounds from '../../services/sounds';

export default ($scope, $rootScope) => {
   
    $scope.isShowTournModal = false;
    $scope.isWaitSpinRate = false;
    $scope.spin = {rate: 0, hash: ''};

    $scope.goInTourn = ()=>{
        $rootScope.api({action: 'goInTourn'}, ()=>{
            noty('success', 'Ваша заявка принята!');
            $scope.updatePublic();
            $rootScope.updateUser();
        });
    };

    $scope.showSpinRateDice = ()=>{
        sounds.playDicesSound();
        $scope.isWaitSpinRate = true;
    };
    $scope.showSpinRateValue = (data)=>{
        $scope.spin = data;
        setTimeout(()=> $scope.isWaitSpinRate = false, 0);
        // $scope.isWaitSpinRate = false;
    };

};