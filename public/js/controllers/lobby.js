app.controller('LobbyController', ['$scope', '$rootScope', '$http', function($scope, $rootScope, $http) {
    $scope.lobbyTables = [];
    // $scope.newScreenName = '';
    $scope.isLoginned = true, // хочет логиниться / регаться
    $scope.status = 'login';
    $scope.isLogged = ()=> {
        return $rootScope.user.isLogged;
    };
    $scope.user = $rootScope.user;
    $rootScope.$watch('user.isLogged', ()=>{
        socket.emit ('checkUser', $rootScope.user.token, response => {
            if (response.success){
                const {position} = response;
                if (position){
                    $rootScope.sittingOnTable = position.sittingOnTable + '';
                    $rootScope.sittingIn = !!(position.sittingOnTable + 1);
                }
                $rootScope.$digest();
            }
            else if (response.message) {
                $scope.registerError = response.message;
                console.log('Error checkUser', response.message);
            }
            $scope.$digest();
        });

    });
    $http({
        url: '/lobby-data',
        method: 'GET'
    }).success(function (data, status, headers, config) {
        for (const tableId in data) {
            $scope.lobbyTables[tableId] = data[tableId];
        }
    });

    $scope.logreg = function() {
        const user = $rootScope.user;
        user.password = $scope.password;
        user.login = $scope.login;
        user.address = $scope.address;
        if (!user.login || !user.password || !$scope.isLoginned && !user.address) {
            console.log('Fill in all the fields!');
            noty('error', 'Заполните все поля!');
            return;
        }
        if (user.address && (user.address.length < 40 || !user.address.startsWith('Mx'))){
            console.log('U minter adress must be Mx345536dsv34344...!');
            noty('error', 'Ваш минтер адрес должен быть <br> <i> Mx345536dsv34344...</i>!');
            return;
        }
        const action = $scope.isLoginned ? 'login' : 'registration';
        $rootScope.api({
            action,
            data: user
        }, (data) => {
            Object.assign($rootScope.user, data);
            $rootScope.user.isLogged = true;
            noty('success', 'Здравствуйте, <i>' + $rootScope.user.login + '</i>!');
        });
    };
}]);
