import app from '../app';
import _ from 'underscore';
import config from '../../config';
import tourn from './mixins/tourn';

app.controller('LobbyController', ['$scope', '$rootScope', '$http', '$location', '$sce', function($scope, $rootScope, $http, $location, $sce) {
    $scope.renderHtml = htmlCode => $sce.trustAsHtml(htmlCode);
    tourn($scope, $rootScope);
    $scope.lobbyTables = [];
    // $scope.newScreenName = '';
    $scope.isLoginned = true, // хочет логиниться / регаться
    $scope.status = 'login';
    $scope.newPassword = '';
    $scope.isLogged = ()=> $rootScope.user.isLogged;
    $scope.user = $rootScope.user;
    $scope.public = {};
    $scope.withdrawAmount = 0;
    $scope.playersInGame = 0;
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

    // window.initSocket(checkUser);
    window.refreshSocket($rootScope.checkUser);
    
    // $rootScope.$watch('user.isLogged', ()=> setTimeout(checkUser, 500));

    const updatePublic = ()=> $http({
        url: window.Domain + '/public',
        method: 'GET'
    }).then(res => {
        if (res.status === 200) {
            $scope.public = res.data;
        }
        $http({
            url: window.Domain + '/lobby-data',
            method: 'GET'
        }).then(res => {
            if (res.status === 200){
                const data = res.data;
                $scope.lobbyTables = [];
                $scope.playersInGame = 0;
                for (const tableId in data) {
                    if (data[tableId]){
                        $scope.lobbyTables.push(data[tableId]);
                        $scope.playersInGame += data[tableId].playersSeatedCount;
                    }
                }
                window.hidePreloader();
            }
        });
    });
    updatePublic();
    $scope.updatePublic = updatePublic;
    setInterval(updatePublic, 30 * 1000);

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

        if (!$scope.isLoginned && !$scope.years18){
            noty('error', 'Подтвердите Ваше совершеннолетие!');
            return;
        }
        const action = $scope.isLoginned ? 'login' : 'registration';
        $rootScope.api({action, data: user}, (data) => {
            $rootScope.user = data;
            $rootScope.user.isLogged = true;
            noty('success', 'Здравствуйте, <i>' + $rootScope.user.login + '</i>!');
            $rootScope.checkUser();
        });
    };

    $scope.restorePswd = () =>{
        $rootScope.api({action: 'restorePswd', data: {pswd: $scope.newPassword}}, data => {
            $scope.checkStrNewPswd = data.controlWord;
            noty('success', 'Заявка успешено создана, ожидается подтверждающая транзакция c <u>Вашего</u> кошелька!');
        });
    };
    $scope.createRoom = function(){
        $rootScope.api({action: 'roomCreate', data: $scope.createdTable}, data=>{
            const path = '/table-' + $scope.createdTable.count + '/' + data.createdRoomId;
            const link = location.origin + '/#!' + path;
            window.copy(link, 'Комната успешно создана. Cсылка на нее скопирована в Ваш буфер обмена, делитесь ей со своими друзьями! Комната будет удалена по истечении ' + config.tableTimeOutLive + ' минут неактивности. Хорошей игры!');
            $location.path(path);
        });
    };
    window.listeningRedirect();
    setTimeout(() => {
        // работа с аватаром
        $scope.uploadAvatar = () => document.getElementById('input-upload-avatar').click();
        document.getElementById('input-upload-avatar').onchange = () => document.getElementById('uploadAvatarForm').submit();
    }, 2000);
}]);


const preloader = document.getElementById('preloader');
preloader.style.opacity = 1;
preloader.style.display = 'flex';
let timeOutHide = null;

window.hidePreloader = () =>{
    timeOutHide = setTimeout(()=>{
        preloader.style.opacity = 0;
        setTimeout(()=>{
            preloader.style.display = 'none';
        }, 500);
    }, 1000);
};

window.showPreloader = ()=>{
    clearTimeout(timeOutHide);
    setTimeout(()=>preloader.style.display = 'flex', 100);
    preloader.style.opacity = 1;
};