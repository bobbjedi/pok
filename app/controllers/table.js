
/**
 * The table controller. It keeps track of the data on the interface,
 * depending on the replies from the server.
 */
import angular from 'angular';
import $u from '../libs/utils';

app.controller('TableController', ['$scope', '$rootScope', '$http', '$routeParams', '$timeout', 'sounds', '$location',
    function($scope, $rootScope, $http, $routeParams, $timeout, sounds, $location) {
        var selectedSeat = null;
        $scope.table = {};
        $scope.notifications = [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}];
        $scope.showingChipsModal = false;
        $scope.actionState = '';
        $scope.table.dealerSeat = null;
        $scope.myCards = ['', ''];
        $scope.mySeat = null;
        $scope.betAmount = 0;
        $scope.inToLobby = false;
        $scope.isOpenSettings = false;
        $scope.round = $u.round;
        $rootScope.winnerName = null;
        $rootScope.winnersData = {};
        $rootScope.winnerMsgArr = [];
        $rootScope.sittingOnTable = null;

        // Existing listeners should be removed
        socket.removeAllListeners();

        // Getting the table data
        $http({
            url: window.Domain + '/table-data/' + $routeParams.tableId,
            method: 'GET'
        }).then(res => {
            if (res.status === 200){
                const data = res.data;
                $scope.table = data.table;
                $scope.buyInAmount = data.table.maxBuyIn;
                $scope.betAmount = data.table.bigBlind;
            }
        });

        // Joining the socket room
        socket.emit('enterRoom', $routeParams.tableId);

        $rootScope.$watch('timeOutCurrent', (v)=>{
            if ($scope.showBigBlindButton() || $scope.showSmallBlindButton()){
                $scope.postBlind(true);
            }

            if ($scope.showCallButton() && $scope.callAmount() === 0){ // сходил в алл ин и ждет автокалит 0
                console.log('Автоколл после аллин');
                return $scope.call();
            }
            if ($scope.showCheckButton() && $scope.table.seats[$scope.mySeat].chipsInPlay <= 0){
                console.log('Авточек после аллин');
                return $scope.check();
            }

            if (v !== 1 || $scope.table.activeSeat !== $scope.mySeat){
                return;
            }
            if ($scope.showCheckButton()){
                $scope.check();
            } else if ($scope.showFoldButton()){
                $scope.fold();
            } else if ($scope.showSitOutButton()){
                $scope.postBlind(false);
            } else if ($scope.showLeaveTableButton()){
                $scope.leaveTable();
            }
        });

        $scope.minBetAmount = function() {
            if ($scope.mySeat === null || typeof $scope.table.seats[$scope.mySeat] === 'undefined' || $scope.table.seats[$scope.mySeat] === null) {return 0;}
            // If the pot was raised
            if ($scope.actionState === "actBettedPot") {
                var proposedBet = +$scope.table.biggestBet + $scope.table.bigBlind;
                return $scope.table.seats[$scope.mySeat].chipsInPlay < proposedBet ? $scope.table.seats[$scope.mySeat].chipsInPlay : proposedBet;
            } else {
                return $scope.table.seats[$scope.mySeat].chipsInPlay < $scope.table.bigBlind ? $scope.table.seats[$scope.mySeat].chipsInPlay : $scope.table.bigBlind;
            }
        };

        $scope.potAmount = ()=> $scope.table.pot && $u.round($scope.table.pot.reduce((s, p)=>{
            return s + p.amount;
        }, 0));

        $scope.maxBetAmount = function() {
            if ($scope.mySeat === null || typeof $scope.table.seats[$scope.mySeat] === 'undefined' || $scope.table.seats[$scope.mySeat] === null) {return 0;}
            return $scope.actionState === "actBettedPot" ? $scope.table.seats[$scope.mySeat].chipsInPlay + $scope.table.seats[$scope.mySeat].bet : $scope.table.seats[$scope.mySeat].chipsInPlay;
        };

        $scope.callAmount = function() {
            if ($scope.mySeat === null || typeof $scope.table.seats[$scope.mySeat] === 'undefined' || $scope.table.seats[$scope.mySeat] == null) {return 0;}
            var callAmount = +$scope.table.biggestBet - $scope.table.seats[$scope.mySeat].bet;
            return callAmount > $scope.table.seats[$scope.mySeat].chipsInPlay ? $scope.table.seats[$scope.mySeat].chipsInPlay : callAmount;
        };

        $scope.showLeaveTableButton = function() {
            return $rootScope.sittingOnTable !== null && (!$rootScope.sittingIn || $scope.actionState === "waiting");
        };
        $scope.showSitOutButton = function() {
            return $scope.actionState === 'postSmallBlind' || $scope.actionState === 'postBigBlind';
        };

        $scope.showSmallBlindButton = function() {
            return $scope.actionState === 'postSmallBlind';
        };
        $scope.showPostSmallBlindButton = function() {
            return $scope.actionState === "actNotBettedPot" || $scope.actionState === "actBettedPot";
        };

        $scope.showPostBigBlindButton = function() {
            return $scope.actionState === "actNotBettedPot" || $scope.actionState === "actBettedPot";
        };
        $scope.showBigBlindButton = function() {
            return $scope.actionState === 'postBigBlind';
        };

        $scope.showFoldButton = function() {
            return $scope.actionState === "actNotBettedPot" || $scope.actionState === "actBettedPot" || $scope.actionState === "actOthersAllIn";
        };

        $scope.showCheckButton = function() {
            return $scope.actionState === "actNotBettedPot" || ($scope.actionState === "actBettedPot" && $scope.table.biggestBet == $scope.table.seats[$scope.mySeat].bet);
        };

        $scope.showCallButton = function() {
            return $scope.actionState === "actOthersAllIn" || $scope.actionState === "actBettedPot" && !($scope.actionState === "actBettedPot" && $scope.table.biggestBet == $scope.table.seats[$scope.mySeat].bet);
        };

        $scope.showBetButton = function() {
            return $scope.actionState === "actNotBettedPot" && $scope.table.seats[$scope.mySeat].chipsInPlay && $scope.table.biggestBet < $scope.table.seats[$scope.mySeat].chipsInPlay;
        };

        $scope.showRaiseButton = function() {
            return $scope.actionState === "actBettedPot" && $scope.table.seats[$scope.mySeat].chipsInPlay && $scope.table.biggestBet < $scope.table.seats[$scope.mySeat].chipsInPlay;
        };

        $scope.showBetRange = function() {
            return ($scope.actionState === "actNotBettedPot" || $scope.actionState === "actBettedPot") && $scope.table.seats[$scope.mySeat].chipsInPlay && $scope.table.biggestBet < $scope.table.seats[$scope.mySeat].chipsInPlay;
        };

        $scope.showBetInput = function() {
            return ($scope.actionState === "actNotBettedPot" || $scope.actionState === "actBettedPot") && $scope.table.seats[$scope.mySeat].chipsInPlay && $scope.table.biggestBet < $scope.table.seats[$scope.mySeat].chipsInPlay;
        };

        $scope.showBuyInModal = function(seat) {
            $scope.buyInModalVisible = true;
            selectedSeat = seat;
        };

        $scope.potText = function() {
            if (typeof $scope.table.pot !== 'undefined' && $scope.table.pot[0].amount) {
                var potText = ' Pot: ' + $u.round($scope.table.pot[0].amount);

                var potCount = $scope.table.pot.length;
                if (potCount > 1) {
                    for (var i = 1; i < potCount; i++) {
                        potText += ' - Sidepot: ' + $u.round($scope.table.pot[i].amount);
                    }
                    potText = 'Total: ' + $scope.potAmount() + potText;
                }
                return potText;
            }
        };

        // Leaving the socket room
        $scope.leaveRoom = function() {
            socket.emit('leaveRoom');
            $location.path('/');
            $scope.inToLobby = false;
        };

        // A request to sit on a specific seat on the table
        $scope.sitOnTheTable = function() {
            socket.emit('sitOnTheTable', { 'seat': selectedSeat, 'tableId': $routeParams.tableId, 'chips': $scope.buyInAmount }, function(response) {
                if (response.success){
                    $scope.buyInModalVisible = false;
                    $rootScope.sittingOnTable = $routeParams.tableId;
                    $rootScope.sittingIn = true;
                    $scope.buyInError = null;
                    $scope.mySeat = selectedSeat;
                    $scope.actionState = 'waiting';
                    $rootScope.updateUser();
                    $scope.$digest();
                } else {
                    if (response.error) {
                        $scope.buyInError = response.error;
                        $scope.$digest();
                    }
                }
            });
        };

        // Sit in the game
        $scope.sitIn = function() {
            socket.emit('sitIn', function(response) {
                if (response.success) {
                    $rootScope.sittingIn = true;
                    $rootScope.$digest();
                }
            });
        };
        $scope.leaveTableStates = ()=>{
            $rootScope.sittingOnTable = null;
            $rootScope.sittingIn = false;
            $scope.actionState = '';
            $rootScope.updateUser();
        };
        // Leave the table (not the room)
        $scope.leaveTable = function() {
            socket.emit('leaveTable', function(response) {
                if (response.success) {
                    $scope.leaveTableStates();
                    $rootScope.$digest();
                    $scope.$digest();
                }
            });
        };

        // Post a blind (or not)
        $scope.postBlind = function(posted) {
            socket.emit('postBlind', posted, function(response) {
                if (response.success && !posted) {
                    $rootScope.sittingIn = false;
                } else {
                    sounds.playBetSound();
                }
                $scope.actionState = '';
                $scope.$digest();
            });
        };

        $scope.check = function() {
            socket.emit('check', function(response) {
                if (response.success) {
                    sounds.playCheckSound();
                    $scope.actionState = '';
                    $scope.$digest();
                }
            });
        };

        $scope.fold = function() {
            socket.emit('fold', function(response) {
                if (response.success) {
                    sounds.playFoldSound();
                    $scope.actionState = '';
                    $scope.$digest();
                }
            });
        };

        $scope.call = function() {
            socket.emit('call', function(response) {
                if (response.success) {
                    sounds.playCallSound();
                    $scope.actionState = '';
                    $scope.$digest();
                }
            });
        };

        $scope.bet = function() {
            socket.emit('bet', $scope.betAmount, function(response) {
                if (response.success) {
                    sounds.playBetSound();
                    $scope.actionState = '';
                    $scope.$digest();
                }
            });
        };

        $scope.raise = function() {
            socket.emit('raise', $scope.betAmount, function(response) {
                if (response.success) {
                    sounds.playRaiseSound();
                    $scope.actionState = '';
                    $scope.$digest();
                }
            });
        };

        let lastSeatActive = -1;
        // When the table data have changed
        socket.on('table-data', function(data) {
            $scope.table = data;
            if (data.activeSeat !== null && lastSeatActive !== data.activeSeat){
                $rootScope.updateTimeOut();
                $rootScope.winnerName = null;
                $rootScope.winnerMsgArr = [];
                $rootScope.winnersData = {};
            }
            switch (data.log.action) {
            case 'fold':
                sounds.playFoldSound();
                break;
            case 'check':
                sounds.playCheckSound();
                break;
            case 'call':
                sounds.playCallSound();
                break;
            case 'bet':
                sounds.playBetSound();
                break;
            case 'raise':
                sounds.playRaiseSound();
                break;
            }
            if (data.log.message) {
                const msg = data.log.message.trim();
                if (msg === $rootScope.user.login + ' left'){
                    $scope.leaveTableStates();
                };
                if (msg.includes('{DATA}')){
                    const data = JSON.parse(msg).winnersData;
                    console.log(data);
                    $rootScope.winnersData = data;
                    $rootScope.winnerMsgArr = Object.keys(data).map(u=> `${u} выиграл ${data[u].amount} (${data[u].cards})`);
                    return $scope.$digest();
                }
                var messageBox = document.querySelector('#messages');
                var messageElement = angular.element('<p class="log-message">' + msg + '</p>');
                angular.element(messageBox).append(messageElement);
                messageBox.scrollTop = messageBox.scrollHeight;
                if (data.log.notification && data.log.seat !== '') {
                    if (!$scope.notifications[data.log.seat].message) {
                        $scope.notifications[data.log.seat].message = data.log.notification;
                        $scope.notifications[data.log.seat].timeout = $timeout(function() {
                            $scope.notifications[data.log.seat].message = '';
                        }, 1000);
                    } else {
                        $timeout.cancel($scope.notifications[data.log.seat].timeout);
                        $scope.notifications[data.log.seat].message = data.log.notification;
                        $scope.notifications[data.log.seat].timeout = $timeout(function() {
                            $scope.notifications[data.log.seat].message = '';
                        }, 1000);
                    }
                }
            }
            $scope.$digest();
        });

        //
        // When the game has stopped
        socket.on('gameStopped', function(data) {
            $scope.table = data;
            $scope.actionState = 'waiting';
            $scope.myCards[0] = '';
            $scope.myCards[1] = '';
            $scope.$digest();
        });

        // When the player is asked to place the small blind
        socket.on('postSmallBlind', function(data) {
            sounds.playMyStepSound();
            $scope.$digest();
            $scope.actionState = 'postSmallBlind';
        });

        // When the player is asked to place the big blind
        socket.on('postBigBlind', function(data) {
            $scope.actionState = 'postBigBlind';
            $scope.$digest();
            sounds.playMyStepSound();
        });

        // When the player is dealt cards
        socket.on('dealingCards', function(cards) {
            $scope.myCards[0] = 'card-' + cards[0];
            $scope.myCards[1] = 'card-' + cards[1];
            $scope.$digest();
        });

        // When the user is asked to act and the pot was betted
        socket.on('actBettedPot', function() {
            $scope.actionState = 'actBettedPot';
            var proposedBet = +$scope.table.biggestBet + $scope.table.bigBlind;
            $scope.betAmount = $scope.table.seats[$scope.mySeat].chipsInPlay < proposedBet ? $scope.table.seats[$scope.mySeat].chipsInPlay : proposedBet;
            $scope.$digest();
            sounds.playMyStepSound();
        });

        // When the user is asked to act and the pot was not betted
        socket.on('actNotBettedPot', function() {
            sounds.playMyStepSound();
            $scope.actionState = 'actNotBettedPot';

            $scope.betAmount = $scope.table.seats[$scope.mySeat].chipsInPlay < $scope.table.bigBlind ? $scope.table.seats[$scope.mySeat].chipsInPlay : $scope.table.bigBlind;
            $scope.$digest();
        });

        // When the user is asked to call an all in
        socket.on('actOthersAllIn', function() {
            sounds.playMyStepSound();
            $scope.actionState = 'actOthersAllIn';

            $scope.$digest();
        });
    }]);
