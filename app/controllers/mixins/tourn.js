export default ($scope, $rootScope) => {
    $scope.isShowTournModal = false;
    $scope.goInTourn = ()=>{
        $rootScope.api({action: 'goInTourn'}, ()=>{
            noty('success', 'Ваша заявка принята!');
            $scope.updatePublic();
            $rootScope.updateUser();
        });
    };
};