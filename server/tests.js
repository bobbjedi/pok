const Player = require('./poker_modules/player');
const Pot = require('./poker_modules/pot');
const $u = require('./helpers/utils');

setTimeout(async ()=>{
    // d - буб
    // h - черв
    // s - пик
    // c - крест
    var Player1 = new Player({}, await $u.getUserFromQ({login: 'Dev'}));
    var Player2 = new Player({}, await $u.getUserFromQ({login: 'Dev1'}));
    
    Player1.public.inHand = true;
    Player2.public.inHand = true;
    Player1.seat = 0;
    Player2.seat = 1;
    Player1.cards = ['5h', '4c'];
    Player2.cards = ['8c', 'Ad'];

    const commonCards = ['6d', '3d', 'Qh', '6h', 'Kd'];
    Player1.evaluateHand(commonCards);
    Player2.evaluateHand(commonCards);
    console.log(Player1.evaluatedHand);
    console.log(Player2.evaluatedHand);

    const pot = new Pot();
    pot.pots = [{ amount: 24, contributors: [0, 1]}];
    pot.tableId = 1;
    pot.destributeToWinners([Player1, Player2], 1);
}, 2000);

// cards: [
//     'Th', '3d',
//     'Kh', '4s',
//     'Ac', 'Jh',
//     'Ks'
//   ]