// import angular from 'angular';
/**
 * The table controller. It keeps track of the data on the interface,
 * depending on the replies from the server.
 */
import angular from 'angular';
import mat from '../libs/mat';

app.controller('ChatController', ['$scope', function($scope) {
    /**
	 * Chat
	 */
    $scope.sendMessage = function() {
        if ($scope.messageText.trim()) {
            var message = $scope.messageText.trim();
            var messageBox = document.querySelector('#messages');
            socket.emit('sendMessage', message);

            var messageElement = angular.element('<p class="message"><b>You</b>: ' + htmlEntities(message) + '</p>');
            angular.element(messageBox).append(messageElement);
            messageBox.scrollTop = messageBox.scrollHeight;
            $scope.messageText = '';
        }
    };

    socket.on('receiveMessage', function(data) {
        var messageBox = document.querySelector('#messages');
        let msg = data.message;
        msg.split(' ').forEach(w=>{
            if (mat.includes(w)){
                msg = '<span class="txt-red">я черный жёпа</span>';
            }
        });
        let color = '';
        if (data.sender === 'Dev'){
            color = 'txt-green';
        }
        var messageElement = angular.element('<p class="message ' + color + ' "><b>' + data.sender + '</b>: ' + msg + '</p>');
        angular.element(messageBox).append(messageElement);
        messageBox.scrollTop = messageBox.scrollHeight;
    });

    function htmlEntities(str) {
	    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
}]);