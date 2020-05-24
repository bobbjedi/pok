
/**
 * The table controller. It keeps track of the data on the interface,
 * depending on the replies from the server.
 */
import $u from '../libs/utils';
import automoves from './mixins/automoves';
import socket from '../services/socket.io';
import app from '../app';
import tourn from './mixins/tourn';
import solover from '../services/solover';
import _ from 'underscore';

app.controller('TableController', ['$scope', '$rootScope', '$http', '$routeParams', '$timeout', 'sounds', '$location', '$sce',
    function($scope, $rootScope, $http, $routeParams, $timeout, sounds, $location, $sce) {
        $scope.renderHtml = htmlCode => $sce.trustAsHtml(htmlCode);
        $rootScope.lastTableId = $routeParams.tableId;

        var selectedSeat = null;
        $scope.table = {seats: [], data: {}, publicMtt: {}};
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
        $rootScope.sittingIn = false;
        $scope.lastEventTime = 0;
        $scope.solover = { win: '-', lose: '-' };
        automoves($scope, $rootScope);
        tourn($scope, $rootScope);

        $scope.checkEmitAction = () =>{
            if (new Date().getTime() - $scope.lastEventTime > 500){
                $scope.lastEventTime = new Date().getTime();
                return true;
            }
            return false;
        };

        $scope.checkUserSeat = ()=>{
            if ($rootScope.sittingIn){
                return;
            }
            const {table} = $scope;
            for (const seat in table.seats){
                const player = table.seats[seat];
                if (player && player.name && player.name === $rootScope.user.login){
                    $rootScope.sittingOnTable = $routeParams.tableId;
                    $rootScope.sittingIn = true;
                    $scope.mySeat = seat;
                    if ($scope.table.seats[seat].hasCards){
                        updateCards();
                    }
                }
            }
        };

        $rootScope.$watch('user.login', $scope.checkUserSeat);
        $scope.$watch('table.coinName', coinName=> $rootScope.changeCoinName(coinName));

        // Existing listeners should be removed
        socket.removeAllListeners();
        window.listeningRedirect();
        socket.on('disconnect', ()=>{
            noty('error', '<i class="fa fa-wifi big" aria-hidden="true"></i> Разрыв соединения!');
            $rootScope.makeReload = ()=>false;
            setTimeout(()=>{
                location.reload();
            }, 5000);
        });
        socket.on('playerLeaveTable', ()=> $scope.mySeat = null);

        // Getting the table data
        const updateTableData = () => {
            $http({
                url: window.Domain + '/table-data/' + $routeParams.tableId,
                method: 'GET'
            }).then(res => {
                if (res.status === 200) {
                    const data = res.data;
                    $scope.table = data.table;
                    $scope.buyInAmount = Math.round(Math.min(data.table.maxBuyIn, $rootScope.user.deposits[$rootScope.settings.coinName]));
                    $scope.betAmount = data.table.bigBlind;
                    $scope.table.board = $scope.table.board.map(c=> c === 'Ad' ? 'Ar' : c);
                    $scope.checkUserSeat();
                }
            });
        };
        updateTableData();

        // Joining the socket room
        // socket.emit('leaveRoom');
        setTimeout(()=> socket.emit('enterRoom', $routeParams.tableId), 1500); //TODO: ПЕРЕПИТАТЬ РЕККОНЕКТЫ!
        setTimeout(updateTableData, 1000); //TODO: ПЕРЕПИТАТЬ РЕККОНЕКТЫ!

        setInterval(()=>$scope.automoves.callback(), 1000);
        $rootScope.makeReload = ()=>$scope.mySeat !== null && $scope.table.dealerSeat !== null;
        $scope.toLobby = ()=>{
            if ($rootScope.makeReload()){
                $scope.inToLobby = true;
            } else {
                $scope.leaveRoom();
            }
        };

        $scope.minBetAmount = function() {
            if ($scope.mySeat === null || typeof $scope.table.seats[$scope.mySeat] === 'undefined' || $scope.table.seats[$scope.mySeat] === null) {
                return 0;
            }
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
            return ($scope.actionState === "actBettedPot" ? $scope.table.seats[$scope.mySeat].chipsInPlay + $scope.table.seats[$scope.mySeat].bet : $scope.table.seats[$scope.mySeat].chipsInPlay);
        };

        $scope.callAmount = function() {
            if ($scope.mySeat === null || typeof $scope.table.seats[$scope.mySeat] === 'undefined' || $scope.table.seats[$scope.mySeat] === null) {return 0;}
            var callAmount = +$scope.table.biggestBet - $scope.table.seats[$scope.mySeat].bet;
            return callAmount > $scope.table.seats[$scope.mySeat].chipsInPlay ? $scope.table.seats[$scope.mySeat].chipsInPlay : callAmount;
        };

        $scope.showLeaveTableButton = function() {
            return $scope.showButtonBuyInGame() || $rootScope.sittingOnTable !== null && (!$rootScope.sittingIn || $scope.actionState === "waiting");
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
            return $scope.actionState === "actNotBettedPot" || ($scope.actionState === "actBettedPot" && $scope.table.biggestBet === $scope.table.seats[$scope.mySeat].bet);
        };

        $scope.showCallButton = function() {
            return $scope.actionState === "actOthersAllIn" || $scope.actionState === "actBettedPot" && !($scope.actionState === "actBettedPot" && $scope.table.biggestBet === $scope.table.seats[$scope.mySeat].bet);
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
            return $scope.table.activeSeat === $scope.mySeat && ($scope.actionState === "actNotBettedPot" || $scope.actionState === "actBettedPot") && $scope.table.seats[$scope.mySeat].chipsInPlay && $scope.table.biggestBet < $scope.table.seats[$scope.mySeat].chipsInPlay;
        };

        $scope.showButtonBuyInGame = function () {
            const mySeat = $scope.table.seats[$scope.mySeat];
            return mySeat && !mySeat.inHand && mySeat.isSitOutMe && !$scope.table.isTourn && $scope.table.seats[$scope.mySeat].chipsInPlay < $scope.table.maxBuyIn;
        };

        $scope.showBuyInModal = function(seat) {
            $scope.buyInModalVisible = true;
            selectedSeat = seat;
        };

        // Leaving the socket room
        $scope.leaveRoom = function() {
            // $scope.leaveTable();
            socket.emit('leaveRoom');
            $location.path('/');
            $scope.inToLobby = false;
        };

        // A request to sit on a specific seat on the table
        $scope.sitOnTheTable = function() {
            if ($scope.showButtonBuyInGame()) { // докуп
                const {chipsInPlay} = $scope.table.seats[$scope.mySeat];
                if ($scope.buyInAmount <= chipsInPlay || $scope.buyInAmount > $scope.table.maxBuyIn) {
                    return noty('error', 'No valid cips count');
                }
                socket.emit('rebuyCoins', {amount: $scope.buyInAmount}, response => {
                    console.log(response);
                    if (response.error) {
                        noty('error', response.error);
                        $scope.buyInError = response.error;
                    } else {
                        noty('success', response.msg);
                    }
                    $scope.buyInModalVisible = false;
                });
                return;
            }

            if ($rootScope.sittingOnTable){ // сесть за стол
                noty('error', 'Вы уже сидите за этим столом.');
                return;
            }
            socket.emit('sitOnTheTable', { 'seat': selectedSeat, 'tableId': $routeParams.tableId, 'chips': $scope.buyInAmount }, function(response) {
                if (response.success){
                    $scope.buyInModalVisible = false;
                    $rootScope.sittingOnTable = $routeParams.tableId;
                    $rootScope.sittingIn = true;
                    $scope.buyInError = null;
                    $scope.mySeat = response.seat || selectedSeat; // если response.seats - турнир
                    $scope.actionState = 'waiting';
                    $rootScope.updateUser();
                    // $scope.$digest();
                } else {
                    if (response.error) {
                        noty('error', response.error);
                        $scope.buyInError = response.error;

                        // $scope.$digest();
                    }
                }
                $scope.$digest();
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
                    $scope.mySeat = null;
                    $scope.leaveTableStates();
                    $rootScope.$digest();
                    $scope.$digest();
                }
            });
        };

        $scope.rebuy = () => socket.emit('mtt-reentry', ()=> {});

        // Post a blind (or not)
        $scope.postBlind = function(posted) {
            if (!$scope.checkEmitAction('fold')){
                return;
            }
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
            if (!$scope.checkEmitAction('fold')){
                return;
            }
            socket.emit('check', function(response) {
                if (response.success) {
                    sounds.playCheckSound();
                    $scope.actionState = '';
                    $scope.$digest();
                }
            });
        };

        $scope.fold = function() {
            if (!$scope.checkEmitAction('fold')){
                return;
            }
            socket.emit('fold', function(response) {
                if (response.success) {
                    sounds.playFoldSound();
                    $scope.actionState = '';
                    $scope.$digest();
                }
            });
        };

        $scope.call = function() {
            if (!$scope.checkEmitAction('fold')){
                return;
            }
            socket.emit('call', function(response) {
                if (response.success) {
                    sounds.playCallSound();
                    $scope.actionState = '';
                    $scope.$digest();
                }
            });
        };

        $scope.bet = function() {
            if (!$scope.checkEmitAction('fold')){
                return;
            }
            socket.emit('bet', $scope.betAmount, function(response) {
                if (response.success) {
                    sounds.playBetSound();
                    $scope.actionState = '';
                    $scope.$digest();
                }
            });
        };

        $scope.raise = function() {
            if (!$scope.checkEmitAction('fold')){
                return;
            }
            socket.emit('raise', $scope.betAmount, function(response) {
                if (response.success) {
                    sounds.playRaiseSound();
                    $scope.actionState = '';
                    $scope.$digest();
                }
            });
        };

        const lastSeatActive = -1;
        // When the table data have changed
        let predCards = '';
        socket.on('table-data', function(data) {
            if (_.isNumber(data.id) && +$routeParams.tableId !== data.id){
                return;
            }

            if (data.board[0].length && data.board.toString() !== predCards){
                sounds.playCardSound();
                predCards = data.board.toString();
            }
            $scope.table = data;
            $scope.checkUserSeat();
            if (data.activeSeat !== null && lastSeatActive !== data.activeSeat){
                $rootScope.updateTimeOut();
                $rootScope.winnerName = null;
                $rootScope.winnerMsgArr = [];
                $rootScope.winnersData = {};
                $scope.isSendActionAuto = false;
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
                    const msgJson = JSON.parse(msg);
                    const data = msgJson.winnersData;
                    const {winnersHands} = msgJson;
                    $u.upCards(winnersHands);
                    $rootScope.winnersData = data;
                    $rootScope.winnerMsgArr = Object.keys(data).map(u=> `${u} выиграл ${$u.round(data[u].amount)} (${data[u].cards || ''})`.replace('()', ''));
                    $scope.automoves.reset();
                    return $scope.$digest();
                }
                window.pushSystemMsg('<p class="log-message">' + msg + '</p>');
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


        $scope.sitOutMe = () => {
            socket.emit('sitOutMe', result => {
                $scope.table.seats[$scope.mySeat].isSitOutMe = result;
            });
        };
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
        socket.on('postSmallBlind', function() {
            sounds.playMyStepSound();
            $scope.$digest();
            $scope.actionState = 'postSmallBlind';
        });

        // When the player is asked to place the big blind
        socket.on('postBigBlind', function() {
            $scope.actionState = 'postBigBlind';
            $scope.$digest();
            sounds.playMyStepSound();
        });

        // When the player is dealt cards
        socket.on('dealingCards', function (cards) {
            if (cards.length) {
                $scope.myCards[0] = 'card-' + cards[0];
                $scope.myCards[1] = 'card-' + cards[1];
                $scope.$digest();
            }
        });

        // When the user is asked to act and the pot was betted
        socket.on('actBettedPot', function() {
            $scope.actionState = 'actBettedPot';
            var proposedBet = +$scope.table.biggestBet + $scope.table.bigBlind;
            $scope.betAmount = $scope.table.seats[$scope.mySeat].chipsInPlay < proposedBet ? $scope.table.seats[$scope.mySeat].chipsInPlay : proposedBet;
            $scope.isSendActionAuto = false;
            $scope.$digest();
            sounds.playMyStepSound();
        });

        // When the user is asked to act and the pot was not betted
        socket.on('actNotBettedPot', function() {
            sounds.playMyStepSound();
            $scope.actionState = 'actNotBettedPot';
            $scope.betAmount = $scope.table.seats[$scope.mySeat].chipsInPlay < $scope.table.bigBlind ? $scope.table.seats[$scope.mySeat].chipsInPlay : $scope.table.bigBlind;
            $scope.isSendActionAuto = false;
            $scope.$digest();
        });

        // When the user is asked to call an all in
        socket.on('actOthersAllIn', function() {
            sounds.playMyStepSound();
            $scope.actionState = 'actOthersAllIn';
            $scope.isSendActionAuto = false;
            $scope.$digest();
        });

        socket.on('waitSpinRate', function() {
            sounds.playMyStepSound();
            $scope.showSpinRateDice();
            $scope.$digest();
        });

        socket.on('getSpinRate', function(data) {
            sounds.playMyStepSound();
            $scope.showSpinRateValue(data);
            $scope.$digest();
        });


        // Апдейт карт пока не будут (пиковые тузы)
        let counterCheckCards = 0;
        const updateCards = () => setTimeout(()=>{
            if ($scope.myCards[0] === '' && counterCheckCards++ < 15) {
                socket.emit('getMyCards');
                updateCards();
            }
        }, 1000);

        // костыль range
        const rangeEl = document.getElementById('range-el');
        const inputEl = document.getElementById('bet-input');

        $scope.$watch('betAmount', v=>{
            const max = $scope.maxBetAmount();
            if (v > max){
                $scope.betAmount = $scope.maxBetAmount();
            } else if (v < 0){
                $scope.betAmount = 0;
            } else if (v < max){
                $scope.betAmount = roundByCrat($scope.betAmount, $scope.table.bigBlind);
            }
            rangeEl.value = v;
            inputEl.value = v;
        });
        let soloverBlocked = false;
        $scope.$watch('table.phase', () => { soloverBlocked = false; });
        $scope.helper = () => {
            $scope.isSoloverShow = true;
            $scope.solover = { win: '-', lose: '-' };
            setTimeout(() => {
                solover($scope.myCards, $scope.table.board, null, $scope.table.seats, res => {
                    if (res.win || res.lose) {
                        $scope.solover = res;
                        $scope.$digest();
                        if(!soloverBlocked){
                            socket.emit('solover', () => $rootScope.updateUser());
                        }
                        soloverBlocked = true;
                    } else {
                        window.noty('error', 'Solover error');
                        $scope.isSoloverShow = false;
                    }
                });
            }, 100);
        };
        rangeEl.onmousemove = () => rangeEl.value !== $scope.betAmount && $scope.$digest();
        window.onRange = el => $scope.betAmount = +el.value;
      
        // Фикс Ad бубнового туза
        $scope.$watch('myCards', () => fixAd($scope.myCards), true);
        $scope.$watch('table.board', () => fixAd($scope.table.board), true);
        for (let i = 0; i <= 9; i++) {
            $scope.$watch('table.seats[' + i + '].cards', () => {
                $scope.table.seats[i] && fixAd($scope.table.seats[i].cards);
            }, true);
        }
    }]);


/**
 * Для бубнового туза
 * @param {Array} cards
 */
const fixAd = cards =>cards && cards.forEach((c, i)=>cards[i] = c.replace('Ad', 'Ar'));


/**
 * Для кратного увеличения ставки
 * @param {String} num
 * @param {String} step
 */
function roundByCrat(num, step){
    num += 0.0000001;
    return $u.round(num + 0.000001 - num % step);
}
