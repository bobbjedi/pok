const Player = require('./poker_modules/player');
const Pot = require('./poker_modules/pot');
const Table = require('./poker_modules/table');
const $u = require('./helpers/utils');

(async ()=>{

    var table,
        players = [],
        initialChips = 0;
    var eventEmitter = function(tableId) {
        return function (eventName, eventData) {};
    };

    var socket = {
        emit: function() {
            return;
        }
    };

    table = new Table(10, 'Sample 10-handed Table', eventEmitter(0), 10, 2, 1, 200, 40, false);

    players[0] = new Player(socket, await $u.getUserFromQ({login: 'Dev'}));
    players[1] = new Player(socket, await $u.getUserFromQ({login: 'Dev1'}));
    players[2] = new Player(socket, await $u.getUserFromQ({login: 'Devi'}));
    players[3] = new Player(socket, await $u.getUserFromQ({login: 'Devid'}));
    initialChips = 1000;

    table.playerSatOnTheTable(players[0], 2, initialChips);
    await wait(1);
    table.playerSatOnTheTable(players[1], 6, initialChips);
    await wait(1);
    table.playerSatOnTheTable(players[2], 4, initialChips);


    table.deck.cards[0] = 'Ah';
    table.deck.cards[1] = 'Kh';

    table.deck.cards[2] = 'Ad';
    table.deck.cards[3] = 'Kd';

    table.deck.cards[4] = 'As';
    table.deck.cards[5] = 'Ks';

    table.deck.cards[6] = '3c';
    table.deck.cards[7] = '5c';
    table.deck.cards[8] = '8c';
    table.deck.cards[9] = 'Js';
    table.deck.cards[10] = 'Qd';

    table.playerPostedSmallBlind();
    table.playerPostedBigBlind();
    table.playerCalled();
    table.playerChecked();
    table.playerChecked();
    table.playerChecked();
    table.playerChecked();
    table.playerChecked();
    table.playerChecked();
    table.playerChecked();

    table.deck.cards[0] = 'Ah';
    table.deck.cards[1] = 'Kh';

    table.deck.cards[2] = 'Ad';
    table.deck.cards[3] = 'Kd';

    table.deck.cards[4] = 'As';
    table.deck.cards[5] = 'Ks';

    table.deck.cards[6] = '3c';
    table.deck.cards[7] = '5c';
    table.deck.cards[8] = '8c';
    table.deck.cards[9] = 'Js';
    table.deck.cards[10] = 'Qd';

    table.playerPostedSmallBlind();
    table.playerPostedBigBlind();
    table.playerCalled();
    table.playerCalled();
    table.playerChecked();
    table.playerBetted(33);
    table.playerCalled();
    table.playerCalled();
    table.playerChecked();
    table.playerChecked();
    table.playerChecked();
    table.playerChecked();
    table.playerChecked();

    table.playerChecked();
    table.playerFolded();
})();



const wait = async s => new Promise(resolve => setTimeout(resolve, s * 1000));
