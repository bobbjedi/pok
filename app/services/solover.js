import * as _ from 'underscore';
const iterats = 5000;

export default startSol;

/**
 * @param {Array} myCards
 * @param {Array} board
 * @param {Number} countPlayers  количество игроков за столом (включая себя)
 */
function simulateIterat(myCards, board, countPlayers, result) {
    const players = [];
    const deck = new Deck();
    deck.cards = _.without(deck.cards, ...myCards.concat(board));
    deck.shuffle();
    let n = 1;
    while (n++ < countPlayers) {
        players.push(deck.deal(2));
    }
    board = board.concat((deck.deal(5 - board.length)));

    const myRating = evaluate(board, myCards).rating;
    let drawCount = 0;
    n = 0;
    while (players[n]) {
        const {rating} = evaluate(board, players[n++]);
        if (rating > myRating) {
            return result.lose++;
        }
        if (myRating === rating){
            drawCount++;
        }
    }
    if (drawCount){
        return result.draw++;
    }
    result.win++;
};

function startSol(myCards, board, countPlayers, seats) {
    countPlayers = countPlayers || _.compact(seats.map(s => s && s.inHand)).length;
    myCards = myCards.map(c=>c.replace('card-', ''));
    board = _.compact(board);
    // console.log(myCards, board, countPlayers);
    const result = {
        win: 0,
        lose: 0,
        draw: 0
    };
    console.time('timer');
    for (let i = 0; i < iterats; i++) {
        simulateIterat(myCards, board, countPlayers, result);
    }
    console.clear();
    console.log(`
    Cards: ${myCards}
    Board: ${board}
    Users: ${countPlayers}
    Iters: ${iterats}
    ******* RESULT: ******
    WIN  : ${Math.round(result.win / iterats * 100)}
    LOSE : ${Math.round(result.lose / iterats * 100)}
    DRAW : ${Math.round(result.draw / iterats * 100)}
`);
    console.timeEnd('timer');
};

// _______________LIBS___________________
function evaluate(board, selfCards) {
    // console.log(board, selfCards);
    var cards = selfCards.concat(board);
    // console.log(cards);
    var cardNamess = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
    var cardNames = {
        'A': 'ace',
        'K': 'king',
        'Q': 'queen',
        'J': 'jack',
        'T': 'ten',
        '9': 'nine',
        '8': 'eight',
        '7': 'seven',
        '6': 'six',
        '5': 'five',
        '4': 'four',
        '3': 'three',
        '2': 'deuce'
    };
    // console.log({cards});
    // Returns the name of the card, in singular or in plural
    var getCardName = function (cardValue, plural) {
        if (typeof plural !== 'undefined' && plural === true) {
            return cardValue === '6' ? cardNames[cardValue] + 'es' : cardNames[cardValue] + 's';
        } else {
            return cardNames[cardValue];
        }
    };

    // Swaps the position of the cards of the first one is smaller than the second one
    var swap = function (index1, index2) {
        if (cardNamess.indexOf(cards[index1][0]) < cardNamess.indexOf(cards[index2][0])) {
            var tmp = cards[index1];
            cards[index1] = cards[index2];
            cards[index2] = tmp;
        }
    };

    var rateHand = function (hand) {
        return cardNamess.indexOf(hand[0][0]) * 30941 + cardNamess.indexOf(hand[1][0]) * 2380 + cardNamess.indexOf(hand[2][0]) * 183 + cardNamess.indexOf(hand[3][0]) * 14 + cardNamess.indexOf(hand[4][0]);
    };

    // Sorting the 7 cards
    cards.sort(function (a, b) {
        return cardNamess.indexOf(b[0]) - cardNamess.indexOf(a[0]);
    });

    var straight = [],
        flushes = {},
        pairs = {};
    flushes['s'] = [],
    flushes['h'] = [],
    flushes['d'] = [],
    flushes['c'] = [];
    const evaluatedHand = {
        'rank': '',
        'name': '',
        'rating': 0,
        'cards': [],
    };
    // Getting the suit of the first card
    flushes[cards[0][1]].push(cards[0]);
    // Pushing the first card in the array of the straight
    straight.push(cards[0]);
    // For the rest of the cards
    for (var i = 1; i < 7; i++) {
        // Get the suit information
        flushes[cards[i][1]].push(cards[i]);

        // Get the card value
        var currentCardValue = cardNamess.indexOf(cards[i][0]);
        var previousCardValue = cardNamess.indexOf(straight[straight.length - 1][0]);

        // If the current value is smaller than the value of the previous card by one, push it to the straight array
        if (currentCardValue + 1 === previousCardValue) {
            straight.push(cards[i]);
        }
        // If it's not smaller by one and it's not equal and a straight hasn't been already completed, restart the array
        else if (currentCardValue !== previousCardValue && straight.length < 5) {
            straight = [cards[i]];
        }
        // Else if the values are the same, there is a pair that will be pushed to the pairs array
        else if (currentCardValue === previousCardValue) {
            if (typeof pairs[cards[i][0]] === 'undefined') {
                pairs[cards[i][0]] = [cards[i - 1], cards[i]];
            } else {
                pairs[cards[i][0]].push(cards[i]);
            }
        }
    }

    // If there are four cards or more for a straight
    if (straight.length >= 4) {
        // If the last card calculated was a deuce and there is an ace in the hand, append it to the end of the straight
        if (straight[straight.length - 1][0] === '2' && cards[0][0] === 'A') {
            straight.push(cards[0]);
        }

        // If there is a straight, change the evaluated hand to a straight
        if (straight.length >= 5) {
            evaluatedHand.rank = 'straight';
            evaluatedHand.cards = straight.slice(0, 5);
        }
    }

    // If there is a flush
    for (var i in flushes) {
        var flushLength = flushes[i].length;
        if (flushLength >= 5) {
            // If there is also a straight, check for a straight flush
            if (evaluatedHand.rank === 'straight') {
                var straightFlush = [flushes[i][0]];
                var j = 1;
                while (j < flushLength && straightFlush.length < 5) {
                    var currentCardValue = cardNamess.indexOf(flushes[i][j][0]);
                    var previousCardValue = cardNamess.indexOf(flushes[i][j - 1][0]);

                    if (currentCardValue + 1 === previousCardValue) {
                        straightFlush.push(flushes[i][j]);
                    } else if (currentCardValue !== previousCardValue && straightFlush.length < 5) {
                        straightFlush = [flushes[i][j]];
                    }
                    j++;
                }
                if (straightFlush.length === 4 && straightFlush[3][0] === '2' && cards.indexOf('A' + i) >= 0) {
                    straightFlush.push('A' + i);
                }
                if (straightFlush.length === 5) {
                    evaluatedHand.cards = straightFlush;
                    if (evaluatedHand.cards[0][0] === 'A') {
                        evaluatedHand.rank = 'royal flush';
                    } else {
                        evaluatedHand.rank = 'straight flush';
                    }
                }
            }
            // If the hand isn't a straight flush, change it to a flush
            if (evaluatedHand.rank !== 'straight flush' && evaluatedHand.rank !== 'royal flush') {
                evaluatedHand.rank = 'flush';
                evaluatedHand.cards = flushes[i].slice(0, 5);
            }
            break;
        }
    }

    // If there isn't a flush or a straight, check for pairs
    if (!evaluatedHand.rank) {
        var numberOfPairs = 0;
        // Counting how many pairs were formed
        for (var i in pairs) {
            numberOfPairs++;
        }
        var kickers = 0;
        var i = 0;
        if (numberOfPairs) {
            // If there is one pair
            if (numberOfPairs === 1) {
                // Add the pair to the evaluated cards that will be returned
                evaluatedHand.cards = pairs[Object.keys(pairs)[0]];
                // If it is a pair
                if (evaluatedHand.cards.length === 2) {
                    evaluatedHand.rank = 'pair';
                    while (kickers < 3) {
                        if (cards[i][0] !== evaluatedHand.cards[0][0]) {
                            evaluatedHand.cards.push(cards[i]);
                            kickers++;
                        }
                        i++;
                    }
                }
                // If it is a three of a kind
                else if (evaluatedHand.cards.length === 3) {
                    evaluatedHand.rank = 'three of a kind';
                    while (kickers < 2) {
                        if (cards[i][0] !== evaluatedHand.cards[0][0]) {
                            evaluatedHand.cards.push(cards[i]);
                            kickers++;
                        }
                        i++;
                    }
                }
                // If it is a four of a kind
                else if (evaluatedHand.cards.length === 4) {
                    evaluatedHand.rank = 'four of a kind';
                    while (kickers < 1) {
                        if (cards[i][0] !== evaluatedHand.cards[0][0]) {
                            evaluatedHand.cards.push(cards[i]);
                            kickers++;
                        }
                        i++;
                    }
                }
            }
            // If there are two pairs
            else if (numberOfPairs === 2) {
                // Add to the evaluated hand, the pair with the greatest value
                if (pairs[Object.keys(pairs)[0]].length > pairs[Object.keys(pairs)[1]].length || (pairs[Object.keys(pairs)[0]].length === pairs[Object.keys(pairs)[1]].length && cardNamess.indexOf(Object.keys(pairs)[0]) > cardNamess.indexOf(Object.keys(pairs)[1]))) {
                    evaluatedHand.cards = pairs[Object.keys(pairs)[0]];
                    delete pairs[Object.keys(pairs)[0]];
                } else {
                    evaluatedHand.cards = pairs[Object.keys(pairs)[1]];
                    delete pairs[Object.keys(pairs)[1]];
                }

                // If the biggest pair has two cards
                if (evaluatedHand.cards.length === 2) {
                    // Add the other two cards to the evaluated hand
                    for (var j = 0; j < 2; j++) {
                        evaluatedHand.cards.push(pairs[Object.keys(pairs)[0]][j]);
                    }
                    evaluatedHand.rank = 'two pair';
                    // Add one kicker
                    while (kickers < 1) {
                        if (cards[i][0] !== evaluatedHand.cards[0][0] && cards[i][0] !== evaluatedHand.cards[2][0]) {
                            evaluatedHand.cards.push(cards[i]);
                            kickers++;
                        }
                        i++;
                    }
                }
                // If the biggest pair has three cards
                else if (evaluatedHand.cards.length === 3) {
                    evaluatedHand.rank = 'full house';
                    for (var j = 0; j < 2; j++) {
                        evaluatedHand.cards.push(pairs[Object.keys(pairs)[0]][j]);
                    }
                    // If the biggest pair has four cards
                } else {
                    evaluatedHand.rank = 'four of a kind';
                    while (kickers < 1) {
                        if (cards[i][0] !== evaluatedHand.cards[0][0]) {
                            evaluatedHand.cards.push(cards[i]);
                            kickers++;
                        }
                        i++;
                    }
                }
                // If there are three pairs
            } else {
                var pairKeys = [Object.keys(pairs)[0], Object.keys(pairs)[1], Object.keys(pairs)[2]];
                // If there is a pair with three cards, it's the biggest pair
                for (var j in pairs) {
                    if (pairs[j].length === 3) {
                        evaluatedHand.rank = 'full house';
                        evaluatedHand.cards = pairs[j];
                        delete pairs[j];
                        break;
                    }
                }
                // Else, there are three pairs of two cards, so find the biggest one
                if (!evaluatedHand.cards.length) {
                    evaluatedHand.rank = 'two pair';
                    if (cardNamess.indexOf(pairKeys[0]) > cardNamess.indexOf(pairKeys[1])) {
                        if (cardNamess.indexOf(pairKeys[0]) > cardNamess.indexOf(pairKeys[2])) {
                            evaluatedHand.cards = pairs[pairKeys[0]];
                            delete pairs[pairKeys[0]];
                        } else {
                            evaluatedHand.cards = pairs[pairKeys[2]];
                            delete pairs[pairKeys[2]];
                        }
                    } else {
                        if (cardNamess.indexOf(pairKeys[1]) > cardNamess.indexOf(pairKeys[2])) {
                            evaluatedHand.cards = pairs[pairKeys[1]];
                            delete pairs[pairKeys[1]];
                        } else {
                            evaluatedHand.cards = pairs[pairKeys[2]];
                            delete pairs[pairKeys[2]];
                        }
                    }
                }
                // Adding the second biggest pair in the hand
                if (cardNamess.indexOf(Object.keys(pairs)[0]) > cardNamess.indexOf(Object.keys(pairs)[1])) {
                    for (var j = 0; j < 2; j++) {
                        evaluatedHand.cards.push(pairs[Object.keys(pairs)[0]][j]);
                    }
                } else {
                    for (var j = 0; j < 2; j++) {
                        evaluatedHand.cards.push(pairs[Object.keys(pairs)[1]][j]);
                    }
                }

                // If the biggest pair has two cards, add one kicker
                if (evaluatedHand.rank === 'two pair') {
                    while (kickers < 1) {
                        if (cards[i][0] !== evaluatedHand.cards[0][0] && cards[i][0] !== evaluatedHand.cards[2][0]) {
                            evaluatedHand.cards.push(cards[i]);
                            kickers++;
                        }
                        i++;
                    }
                }
            }
        }
    }

    if (!evaluatedHand.rank) {
        evaluatedHand.rank = 'high card';
        evaluatedHand.cards = cards.slice(0, 5);
    }

    switch (evaluatedHand.rank) {
    case 'high card':
        evaluatedHand.name = getCardName(evaluatedHand.cards[0][0]) + ' high';
        evaluatedHand.rating = rateHand(evaluatedHand.cards);
        break;
    case 'pair':
        evaluatedHand.name = 'a pair of ' + getCardName(evaluatedHand.cards[0][0], true);
        evaluatedHand.rating = rateHand(evaluatedHand.cards) + 1000000;
        break;
    case 'two pair':
        evaluatedHand.name = 'two pair, ' + getCardName(evaluatedHand.cards[0][0], true) + ' and ' + getCardName(evaluatedHand.cards[2][0], true);
        evaluatedHand.rating = rateHand(evaluatedHand.cards) + 2000000;
        break;
    case 'three of a kind':
        evaluatedHand.name = 'three of a kind, ' + getCardName(evaluatedHand.cards[0][0], true);
        evaluatedHand.rating = rateHand(evaluatedHand.cards) + 3000000;
        break;
    case 'straight':
        evaluatedHand.name = 'a straight to ' + getCardName(straight[0][0]);
        evaluatedHand.rating = rateHand(evaluatedHand.cards) + 4000000;
        break;
    case 'flush':
        evaluatedHand.name = 'a flush, ' + getCardName(evaluatedHand.cards[0][0]) + ' high';
        evaluatedHand.rating = rateHand(evaluatedHand.cards) + 5000000;
        break;
    case 'full house':
        evaluatedHand.name = 'a full house, ' + getCardName(evaluatedHand.cards[0][0], true) + ' full of ' + getCardName(evaluatedHand.cards[3][0], true);
        evaluatedHand.rating = rateHand(evaluatedHand.cards) + 6000000;
        break;
    case 'four of a kind':
        evaluatedHand.name = 'four of a kind, ' + getCardName(evaluatedHand.cards[0][0], true);
        evaluatedHand.rating = rateHand(evaluatedHand.cards) + 7000000;
        break;
    case 'straight flush':
        evaluatedHand.name = 'a straight flush, ' + getCardName(evaluatedHand.cards[4][0]) + ' to ' + getCardName(evaluatedHand.cards[0][0]);
        evaluatedHand.rating = rateHand(evaluatedHand.cards) + 8000000;
        break;
    case 'royal flush':
        evaluatedHand.name = 'a royal flush';
        evaluatedHand.rating = rateHand(evaluatedHand.cards) + 8000000;
        break;
    }

    return evaluatedHand;
};


/**
 * The deck "class"
 */
function Deck() {
    this.nextCard = 0;
    this.cards = ['As', 'Ah', 'Ad', 'Ac',
        'Ks', 'Kh', 'Kd', 'Kc',
        'Qs', 'Qh', 'Qd', 'Qc',
        'Js', 'Jh', 'Jd', 'Jc',
        'Ts', 'Th', 'Td', 'Tc',
        '9s', '9h', '9d', '9c',
        '8s', '8h', '8d', '8c',
        '7s', '7h', '7d', '7c',
        '6s', '6h', '6d', '6c',
        '5s', '5h', '5d', '5c',
        '4s', '4h', '4d', '4c',
        '3s', '3h', '3d', '3c',
        '2s', '2h', '2d', '2c'];
    this.shuffle = function () {
        this.shuffleOnce();
        this.shuffleOnce();
        this.shuffleOnce();
    };
    this.shuffleOnce = function(){
        // Going back to the top of the deck
        this.nextCard = 0;
        var shuffledDeck = [];

        for (var i = 0; i < 52; i++) {
            var random_card = this.cards.splice(Math.floor(Math.random() * this.cards.length), 1);
            shuffledDeck = shuffledDeck.concat(random_card);
        }
        this.cards = shuffledDeck;
    };
    this.deal = function(numberOfCards) {
        var dealtCards = [];
        for (var i = 0; i < numberOfCards && this.nextCard < 52; i++) {
            dealtCards.push(this.cards[this.nextCard]);
            this.nextCard++;
        }
        return dealtCards;
    };
};
