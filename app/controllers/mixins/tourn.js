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
        $scope.isWaitSpinRate = true;
    };
    $scope.showSpinRateValue = (data)=>{
        $scope.spin = data;
        // setTimeout(()=> $scope.isWaitSpinRate = false, 3000);
        $scope.isWaitSpinRate = false;
    };

};