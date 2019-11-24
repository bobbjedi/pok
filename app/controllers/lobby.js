import _ from 'underscore';
import config from '../../config';

app.controller('LobbyController', ['$scope', '$rootScope', '$http', '$location', function($scope, $rootScope, $http, $location) {
    $scope.lobbyTables = [];
    // $scope.newScreenName = '';
    $scope.isLoginned = true, // хочет логиниться / регаться
    $scope.status = 'login';
    $scope.isLogged = ()=> $rootScope.user.isLogged;
    $scope.user = $rootScope.user;
    $scope.addressShort = ()=>{
        const address = $rootScope.user.address;
        return address.slice(0, 7) + '...' + address.slice(address.length - 7, address.length - 1);
    };
    $scope.createdTable = {
        name: '',
        sb: 1,
        count: "2",
        isPrivate: false,
        maxBuyIn: 100
    };
    const preloader = document.getElementById('preloader');
    preloader.style.opacity = 1;
    preloader.style.display = 'flex';
    $scope.hidePreloader = () =>{
        setTimeout(()=>{
            preloader.style.opacity = 0;
            setTimeout(()=>{
                preloader.style.display = 'none';
            }, 500);
        }, 1000);
    };

    const checkUser = _.throttle(() => {
        $scope.createdTable.name = ' (' + $rootScope.user.login + ')' || '';
        socket.emit ('checkUser', {token: $rootScope.user.token, name: $rootScope.user.login}, response => {
            if (response.success){
                $rootScope.updateUser();
            }
            else if (response.message) {
                $scope.registerError = response.message;
                console.log('Error checkUser', response.message);
            }
            $scope.$digest();
        });
    }, 500);
    window.reconnectSocket(checkUser);
    $rootScope.$watch('user.isLogged', ()=> setTimeout(checkUser, 500));

    $http({
        url: window.Domain + '/lobby-data',
        method: 'GET'
    }).then(res => {
        if (res.status === 200){
            const data = res.data;
            $scope.lobbyTables = [];
            for (const tableId in data) {
                if (data[tableId]){
                    $scope.lobbyTables.push(data[tableId]);
                }
            }
            $scope.hidePreloader();
        }
    });

    $scope.logreg = function() {
        const user = $rootScope.user;
        user.password = $scope.password;
        user.login = $scope.login;
        user.address = $scope.address;
        // console.log(!user.login, !user.password, !$scope.isLoginned, !user.address)
        if (!user.login || !user.password || !$scope.isLoginned && !user.address) {
            // console.log('Fill in all the fields!');
            noty('error', 'Заполните все поля!');
            return;
        }
        if (user.address && (user.address.length < 40 || !user.address.startsWith('Mx'))){
            // console.log('U minter adress must be Mx345536dsv34344...!');
            noty('error', 'Ваш минтер адрес должен быть <br> <i> Mx345536dsv34344...</i>!');
            return;
        }
        const action = $scope.isLoginned ? 'login' : 'registration';
        $rootScope.api({action, data: user}, (data) => {
            $rootScope.user = data;
            $rootScope.user.isLogged = true;
            noty('success', 'Здравствуйте, <i>' + $rootScope.user.login + '</i>!');
        });
    };
    $scope.createRoom = function(){
        console.log($scope.createdTable);
        $rootScope.api({action: 'roomCreate', data: $scope.createdTable}, data=>{
            const path = '/table-' + $scope.createdTable.count + '/' + data.createdRoomId;
            const link = location.origin + '/#!' + path;
            window.copy(link, 'Комната успешно создана. Cсылка на нее скопирована в Ваш буфер обмена, делитесь ей со своими друзьями! Комната будет удалена по истечении ' + config.tableTimeOutLive + ' минут неактивности. Хорошей игры!');
            $location.path(path);
        });
    };

    setTimeout(() => {
        // работа с аватаром
        $scope.uploadAvatar = () => document.getElementById('input-upload-avatar').click();
        document.getElementById('input-upload-avatar').onchange = () => document.getElementById('uploadAvatarForm').submit();
    }, 2000);
}]);
