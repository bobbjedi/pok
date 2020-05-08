/**
 * The seat directive. It requires two attributes.
 * seatIndex: The index of the player in the "seats" array
 * cellNumber: The number of the cell in the grid (used for styles)
 */
import app from '../app';
import template from '../partials/seat.html';
app.directive('seat', [function() {
    return {
        restrict: 'E',
        template: template,
        replace: true,
        scope: {
            player: '=',
            mySeat: '=',
            myCards: '=',
            activeSeat: '=',
            selectedSeat: '=',
            sittingOnTable: '=',
            dealerSeat: '=',
            notifications: '=',
            phase: '=',
            showBuyInModal: '&',
            isMtt: '='
        },
        link: (scope, element, attributes) => {
            scope.isShowMyCards = false; // показать карты в фолде
            scope.seatIndex = parseInt(attributes.seatIndex);
            scope.cellNumber = parseInt(attributes.cellNumber);

            scope.isMe = seat => scope.mySeat !== null && +seat === +scope.mySeat;

            scope.getCardClass = (seat, card) => {
                if (scope.mySeat !== null && +scope.mySeat === seat) {
                    return scope.myCards[card];
                }
                else if (typeof scope.player !== 'undefined' && scope.player && scope.player.cards && scope.player.cards[card]) {
                    return 'card-' + scope.player.cards[card];
                }
                else {
                    return 'card-back';
                }
            };

            scope.seatOccupied = () => {
                return !scope.sittingOnTable || (typeof scope.player !== 'undefinde' && scope.player && scope.player.name);
            };
        }
    };
}]);
