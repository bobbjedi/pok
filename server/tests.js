const Player = require('./poker_modules/player');
const Pot = require('./poker_modules/pot');
const $u = require('./helpers/utils');
const Store = require('./modules/Store');
const Table = require('./poker_modules/table');
var eventEmitter = function(tableId) {
    return function (eventName, eventData) {};
};

setTimeout(async ()=>{
    // d - буб
    // h - черв
    // s - пик
    // c - крест
    // var Player1 = new Player({}, await $u.getUserFromQ({login: 'Dev'}));
    // var Player2 = new Player({}, await $u.getUserFromQ({login: 'Dev1'}));
    
    // Player1.public.inHand = true;
    // Player2.public.inHand = true;
    // Player1.seat = 0;
    // Player2.seat = 1;
    // Player1.cards = ['5h', '4c'];
    // Player2.cards = ['8c', 'Ad'];

    // const commonCards = ['6d', '3d', 'Qh', '6h', 'Kd'];
    // Player1.evaluateHand(commonCards);
    // Player2.evaluateHand(commonCards);
    // console.log(Player1.evaluatedHand);
    // console.log(Player2.evaluatedHand);

    // const pot = new Pot();
    // pot.pots = [{ amount: 24, contributors: [0, 1]}];
    // pot.tableId = 1;
    // pot.destributeToWinners([Player1, Player2], 1);


    checkDepositsStreams();
}, 10000);

// проверка как депозит/фишки перетекают в разных условиях
async function checkDepositsStreams(){
    const coinName = 'BIP';
    const buyIn =100;
    const table = new Table(10, 'Sample 10-handed Table', eventEmitter(0), 10, 2, 1, 200, 40, false, false, false, false, coinName);
    Store.tables = {10: table};
    let user1 = await $u.getUserFromQ({login: 'Dev'});
    let user2 = await $u.getUserFromQ({login: 'Devi'});
    const beforeDep1 = user1.deposits[coinName];
    const beforeDep2 = user2.deposits[coinName];
    const player1 = await $u.createOffLinePlayer('Dev');
    const player2 = await $u.createOffLinePlayer('Devi');
    await $u.wait(.5);
    await table.playerSatOnTheTable(player1, 1, 100);
    await $u.wait(.5);
    await table.playerSatOnTheTable(player2, 2, 100);
    await $u.wait(1.5);
    // console.log('CC', (await player1.getUserDB()).deposits[coinName]);
    user1 = await player1.getUserDB();
    user2 = await player2.getUserDB();

    const afterDep1 = user1.deposits[coinName];
    const afterDep2 = user2.deposits[coinName];
    
    let chipsInPlay1 = user1.depositInGame[coinName];
    let chipsInPlay2 = user2.depositInGame[coinName];
    
    if (beforeDep1 - buyIn !== afterDep1 || afterDep1 !== player1.chips || chipsInPlay1 !== buyIn){
        console.log('ERROR: ', {beforeDep1, afterDep1, chips: player1.chips, chipsInPlay1});
    } else {
        console.log('OK: ', {beforeDep1, afterDep1, chips: player1.chips, chipsInPlay1});   
    }
    if (beforeDep2 - buyIn !== afterDep2 || afterDep2 !== player2.chips || chipsInPlay1 !== buyIn){
        console.log('ERROR: ', {beforeDep2, afterDep2, chips: player2.chips, chipsInPlay2});
    } else {
        console.log('OK: ', {beforeDep2, afterDep2, chips: player2.chips, chipsInPlay2});
    }
    
    player1.sitOut(1, 1);

}
// cards: [
//     'Th', '3d',
//     'Kh', '4s',
//     'Ac', 'Jh',
//     'Ks'
//   ]