// import angular from 'angular';
/**
 * The table controller. It keeps track of the data on the interface,
 * depending on the replies from the server.
 */
import app from '../app';
import socket from '../directives/socket.io';

app.controller('ChatController', ['$scope', '$sce', function($scope, $sce) {
    /**
	 * Chat
	 */
    $scope.renderHtml = htmlCode => $sce.trustAsHtml(htmlCode);
    $scope.messages = [];
    $scope.isShowMessages = true;
    $scope.isShowSystem = true;
    var messageBox = document.querySelector('#messages');
    $scope.$watch('messages.length', ()=> setTimeout(()=> messageBox.scrollTop = messageBox.scrollHeight, 200));
    $scope.sendMessage = function() {
        if ($scope.messageText.trim()) {
            var message = $scope.messageText.trim();

            socket.emit('sendMessage', message);
            $scope.messages.push({type: 'msg', html: '<p class="message"><b>You</b>: ' + htmlEntities(message) + '</p>'});
            messageBox.scrollTop = messageBox.scrollHeight;
            $scope.messageText = '';
        }
    };

    socket.on('receiveMessage', function(data) {
        // var messageBox = document.querySelector('#messages');
        let msg = data.message;
        // msg.split(' ').forEach(w=>{
        // if (mat.includes(w)){
        //     msg = '<span class="txt-red">я черный жёпа</span>';
        // }
        // });
        let color = '';
        if (data.sender === 'Dev'){
            color = 'txt-green';
        }
        $scope.messages.push({type: 'msg', html: '<p class="message ' + color + ' "><b>' + data.sender + '</b>: ' + msg + '</p>'});
    });
    window.pushSystemMsg = html => $scope.messages.push({type: 'system', html});

    function htmlEntities(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
}]);
