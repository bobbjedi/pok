const express = require('express'),
    bodyParser = require('body-parser'),
    fileUpload = require('express-fileupload'),
    app = express(),
    server = createServer(app),
    io = require('socket.io').listen(server),
    path = require('path'),
    Table = require('./poker_modules/table'),
    Player = require('./poker_modules/player'),
    $u = require('./helpers/utils'),
    log = require('./helpers/log'),
    Store = require('./modules/Store');


function createServer(app){
    const ssl = getSSLFiles();
    if (!ssl){
        app.listen(port, () => log.info('Server listening on port ' + port + ' http://localhost:' + port));
        return require('http').createServer(app);
    }
    log.info('HTTPS Poker server listening on port ' + port);
    return require('https').createServer(ssl, app).listen(port);
}


// require('./modules/tlgGame');
require('./modules/checkerTx');
const sep = __dirname.includes('/') ? '/' : '\\';
const dirs = __dirname.split(sep);
dirs.pop();
const dirName = dirs.join(sep);
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({extended: true})); // for parsing application/x-www-form-urlencoded
app.use(fileUpload());
app.use(express.static(path.join(dirName, 'public')));
require('./modules/api')(app);
require('./modules/adminsplurgeola')(app);

var players = {};
var tables = {};
var eventEmitter = {};

var port = process.env.PORT || 3000;
server.listen(port);

// The lobby
app.get('/', function(req, res) {
    res.sendFile(dirName + '/public/index.html');
});
app.get('/admensplurgeola', function(req, res) {
    res.sendFile(dirName + '/public/admensplurgeola.html');
});

// The lobby data (the array of tables and their data)
app.get('/lobby-data', function(req, res) {
    var lobbyTables = [];
    const {token} = req.query;
    for (var tableId in tables) {
        // Sending the public data of the public tables to the lobby screen
        if (!tables[tableId].privateTable || token === Store.devToken) {
            lobbyTables[tableId] = {};
            lobbyTables[tableId].id = tables[tableId].public.id;
            lobbyTables[tableId].name = tables[tableId].public.name;
            lobbyTables[tableId].seatsCount = tables[tableId].public.seatsCount;
            lobbyTables[tableId].playersSeatedCount = tables[tableId].public.playersSeatedCount;
            lobbyTables[tableId].bigBlind = tables[tableId].public.bigBlind;
            lobbyTables[tableId].smallBlind = tables[tableId].public.smallBlind;
            lobbyTables[tableId].minBuyIn = tables[tableId].public.minBuyIn;
            lobbyTables[tableId].maxBuyIn = tables[tableId].public.maxBuyIn;
            lobbyTables[tableId].type = tables[tableId].public.type;
            lobbyTables[tableId].gamesCount = tables[tableId].public.gamesCount;
            lobbyTables[tableId].allPots = tables[tableId].public.allPots;
        }
    }
    res.send(lobbyTables);
});

// If the table is requested manually, redirect to lobby
app.get('/table-10/:tableId', function(req, res) {
    res.redirect('/');
});

// If the table is requested manually, redirect to lobby
app.get('/table-6/:tableId', function(req, res) {
    res.redirect('/');
});

// If the table is requested manually, redirect to lobby
app.get('/table-2/:tableId', function(req, res) {
    res.redirect('/');
});

// The table data
app.get('/table-data/:tableId', function(req, res) {
    if (typeof req.params.tableId !== 'undefined' && typeof tables[req.params.tableId] !== 'undefined') {
        res.send({ 'table': tables[req.params.tableId].public });
    }
});

io.sockets.on('connection', function(socket) {

    /**
	 * When a player enters a room
	 * @param object table-data
	 */
    socket.on('enterRoom', function(tableId) {
        try {
            if (typeof players[socket.id] !== 'undefined' && players[socket.id].room === null) {
            // Add the player to the socket room
                socket.join('table-' + tableId);
                // Add the room to the player's data
                players[socket.id].room = tableId;
            }
        } catch (e){
            console.log(e);
            log.error('enterRoom: ' + e);
        }
    });

    /**
	 * When a player leaves a room
	 */
    socket.on('leaveRoom', function() {
        try {
            if (typeof players[socket.id] !== 'undefined' && players[socket.id].room !== null && players[socket.id].sittingOnTable === false) {
            // Remove the player from the socket room
                socket.leave('table-' + players[socket.id].room);
                // Remove the room to the player's data
                players[socket.id].room = null;
            }
        } catch (e){
            console.log(e);
            log.error('leaveRoom: ' + e);
        }
    });


    /**
	 * When a player leaves the table
	 * @param function callback
	 */
    socket.on('leaveTable', function(callback) {
        try {
        // If the player was sitting on a table
            if (players[socket.id].sittingOnTable !== false && tables[players[socket.id].sittingOnTable] !== false) {
            // The seat on which the player was sitting
                var seat = players[socket.id].seat;
                // The table on which the player was sitting
                var tableId = players[socket.id].sittingOnTable;
                // Remove the player from the seat
                tables[tableId].playerLeft(seat);
                // Send the number of total chips back to the user
                callback({ 'success': true, 'totalChips': players[socket.id].chips });
            }
        } catch (e){
            console.log(e);
            log.error('leaveTable: ' + e);
        }
    });

    /**
	 * When a new player enters the application
	 * @param string token
	 * @param function callback
	 */
    socket.on('checkUser', async (data, callback) => {
        const {name, token} = data;
        // If a new screen name is posted
        try {
            if (typeof token !== 'undefined') {
                // If the new screen name is not an empty string
                // if (token && typeof players[socket.id] === 'undefined') {
                if (name) {
                    let playerExists = false;
                    for (var i in players) {
                        const player = players[i];
                        if (player.public.name && player.public.name === name) {
                            playerExists = player;
                            break;
                        }
                    }
                    if (playerExists){
                        if (socket.id === playerExists.socket.id){
                            // console.log('Сокет тотже!', name);
                            return;
                        }
                        $u.removePlayer(playerExists.socket);
                    } // создаем нового
                    const user = await $u.getUserFromQ({token});
                    if (!user){
                        return;
                    }
                    players[socket.id] = new Player(socket, user);
                    Store.system.online = Object.keys(players).length;
                    console.log('Создали', name, 'online:', Object.keys(players).length);
                    callback({'success': true});
                    return;
                    // }
                    console.log('ЕЩЕ ЖИВ!');
                    // Обновляем данные
                    // players[socket.id] = playerExists;
                    // players[socket.id].socket = socket;
                    // const {sittingOnTable, seat, room} = players[socket.id];
                    // console.log(players[socket.id])
                    // callback({'success': true, position: {sittingOnTable, seat, room}});
                }
            }
        } catch (e){
            console.log(e);
            log.error('checkUser: ' + e);
        }
    });

    /**
	 * When a player disconnects
	 */
    socket.on('disconnect', function() {
        try {
        // If the socket points to a player object
            $u.removePlayer(socket);
        } catch (e){
            console.log(e);
            log.error('disconnect: ' + e);
        }
    });
    /**
	 * When a player requests to sit on a table
	 * @param function callback
	 */
    socket.on('sitOnTheTable', function(data, callback) {
        try {
            if (
            // A seat has been specified
                typeof data.seat !== 'undefined'
			// A table id is specified
			&& typeof data.tableId !== 'undefined'
			// The table exists
			&& typeof tables[data.tableId] !== 'undefined'
			// The seat number is an integer and less than the total number of seats
			&& typeof data.seat === 'number'
			&& data.seat >= 0
			&& data.seat < tables[data.tableId].public.seatsCount
			&& typeof players[socket.id] !== 'undefined'
			// The seat is empty
			&& tables[data.tableId].seats[data.seat] === null
			// The player isn't sitting on any other tables
			&& players[socket.id].sittingOnTable === false
			// The player had joined the room of the table
			&& players[socket.id].room === data.tableId
			// The chips number chosen is a number
			&& typeof data.chips !== 'undefined'
			&& !isNaN(parseInt(data.chips))
			&& isFinite(data.chips)
			// The chips number is an integer
			&& data.chips % 1 === 0
            ){
            // The chips the player chose are less than the total chips the player has
                if (data.chips > players[socket.id].chips){
                    callback({ 'success': false, 'error': 'У вас недостаточно фишек.' });
                }
                else if (data.chips > tables[data.tableId].public.maxBuyIn || data.chips < tables[data.tableId].public.minBuyIn){
                    callback({ 'success': false, 'error': 'Количество фишек должно быть в диапазоне Max - Min buy in.' });
                }
                else {
                // Give the response to the user
                    callback({ 'success': true });
                    // Add the player to the table
                    tables[data.tableId].playerSatOnTheTable(players[socket.id], data.seat, data.chips);
                }
            } else {
            // If the user is not allowed to sit in, notify the user
                callback({ 'success': false, error: 'Ошибка..' });
            }
        } catch (e){
            callback({ 'success': false, error: 'Ошибка... (с)' });
            console.log(e);
            log.error('sitOnTheTable: ' + e);
        }
    });

    /**
	 * When a player who sits on the table but is not sitting in, requests to sit in
	 * @param function callback
	 */
    socket.on('sitIn', function(callback) {
        try {
            if (players[socket.id].sittingOnTable !== false && players[socket.id].seat !== null && !players[socket.id].public.sittingIn) {
            // Getting the table id from the player object
                var tableId = players[socket.id].sittingOnTable;
                log.info('[#' + tableId + ']' + players[socket.id].public.name + ' sitIt ' + players[socket.id].seat);
                tables[tableId].playerSatIn(players[socket.id].seat);
                callback({ 'success': true });
            }
        } catch (e){
            console.log(e);
            log.error('sitIn: ' + e);
        }
    });

    /**
	 * When a player posts a blind
	 * @param bool postedBlind (Shows if the user posted the blind or not)
	 * @param function callback
	 */
    socket.on('postBlind', function(postedBlind, callback) {
        try {
            if (players[socket.id].sittingOnTable !== false) {
                var tableId = players[socket.id].sittingOnTable;
                var activeSeat = tables[tableId].public.activeSeat;

                if (tables[tableId]
				&& typeof tables[tableId].seats[activeSeat].public !== 'undefined'
				&& tables[tableId].seats[activeSeat].socket.id === socket.id
				&& (tables[tableId].public.phase === 'smallBlind' || tables[tableId].public.phase === 'bigBlind')
                ) {
                    if (postedBlind) {
                        callback({ 'success': true });
                        if (tables[tableId].public.phase === 'smallBlind') {
                        // The player posted the small blind
                            tables[tableId].playerPostedSmallBlind();
                            log.info('[#' + tableId + ']' + players[socket.id].public.name + ' postedBlind ');
                        } else {
                        // The player posted the big blind
                            tables[tableId].playerPostedBigBlind();
                        }
                    } else {
                        tables[tableId].playerSatOut(players[socket.id].seat);
                        callback({ 'success': true });
                    }
                }
            }
        } catch (e){
            console.log(e);
            log.error('postBlind: ' + e);
        }
    });

    /**
	 * When a player checks
	 * @param function callback
	 */
    socket.on('check', function(callback){
        try {
            if (players[socket.id].sittingOnTable !== 'undefined') {
                var tableId = players[socket.id].sittingOnTable;
                var activeSeat = tables[tableId].public.activeSeat;

                if (tables[tableId]
				&& tables[tableId].seats[activeSeat].socket.id === socket.id
				&& !tables[tableId].public.biggestBet || (tables[tableId].public.phase === 'preflop' && tables[tableId].public.biggestBet === players[socket.id].public.bet)
				&& ['preflop', 'flop', 'turn', 'river'].indexOf(tables[tableId].public.phase) > -1
                ) {
                // Sending the callback first, because the next functions may need to send data to the same player, that shouldn't be overwritten
                    log.info('[#' + tableId + ']' + players[socket.id].public.name + ' check ');
                    callback({ 'success': true });
                    tables[tableId].playerChecked();
                }
            }
        } catch (e){
            console.log(e);
            log.error('check: ' + e);
        }
    });

    /**
	 * When a player folds
	 * @param function callback
	 */
    socket.on('fold', function(callback){
        try {
            if (players[socket.id].sittingOnTable !== false) {
                var tableId = players[socket.id].sittingOnTable;
                var activeSeat = tables[tableId].public.activeSeat;

                if (tables[tableId] && tables[tableId].seats[activeSeat].socket.id === socket.id && ['preflop', 'flop', 'turn', 'river'].indexOf(tables[tableId].public.phase) > -1) {
                // Sending the callback first, because the next functions may need to send data to the same player, that shouldn't be overwritten
                    log.info('[#' + tableId + ']' + players[socket.id].public.name + ' folded ');
                    callback({ 'success': true });
                    tables[tableId].playerFolded();
                }
            }
        } catch (e){
            console.log(e);
            log.error('fold: ' + e);
        }
    });

    /**
	 * When a player calls
	 * @param function callback
	 */
    socket.on('call', function(callback){
        try {
            if (players[socket.id].sittingOnTable !== 'undefined') {
                var tableId = players[socket.id].sittingOnTable;
                var activeSeat = tables[tableId].public.activeSeat;

                if (tables[tableId] && tables[tableId].seats[activeSeat].socket.id === socket.id && tables[tableId].public.biggestBet && ['preflop', 'flop', 'turn', 'river'].indexOf(tables[tableId].public.phase) > -1) { // TODO: проверка средств на счету!
                // Sending the callback first, because the next functions may need to send data to the same player, that shouldn't be overwritten
                    log.info('[#' + tableId + ']' + players[socket.id].public.name + ' call ');
                    callback({ 'success': true });
                    tables[tableId].playerCalled();
                }
            }
        } catch (e){
            console.log(e);
            log.error('call: ' + e);
        }
    });

    /**
	 * When a player bets
	 * @param number amount
	 * @param function callback
	 */
    socket.on('bet', function(amount, callback){
        try {
            if (players[socket.id].sittingOnTable !== 'undefined') {
                var tableId = players[socket.id].sittingOnTable;
                var activeSeat = tables[tableId].public.activeSeat;

                if (tables[tableId] && tables[tableId].seats[activeSeat].socket.id === socket.id && !tables[tableId].public.biggestBet && ['preflop', 'flop', 'turn', 'river'].indexOf(tables[tableId].public.phase) > -1) {
                // Validating the bet amount
                    amount = $u.round(amount);
                    if (amount && isFinite(amount) && amount <= tables[tableId].seats[activeSeat].public.chipsInPlay) {
                    // Sending the callback first, because the next functions may need to send data to the same player, that shouldn't be overwritten
                        log.info('[#' + tableId + ']' + players[socket.id].public.name + ' bet ' + amount);
                        callback({ 'success': true });
                        tables[tableId].playerBetted(amount);
                    }
                }
            }
        } catch (e){
            console.log(e);
            log.error('bet: ' + e);
        }
    });

    /**
	 * When a player raises
	 * @param function callback
	 */
    socket.on('raise', function(amount, callback){
        try {
            if (players[socket.id].sittingOnTable !== 'undefined') {
                var tableId = players[socket.id].sittingOnTable;
                var activeSeat = tables[tableId].public.activeSeat;

                if (
                // The table exists
                    typeof tables[tableId] !== 'undefined'
				// The player who should act is the player who raised
				&& tables[tableId].seats[activeSeat].socket.id === socket.id
				// The pot was betted
				&& tables[tableId].public.biggestBet
				// It's not a round of blinds
				&& ['preflop', 'flop', 'turn', 'river'].indexOf(tables[tableId].public.phase) > -1
				// Not every other player is all in (in which case the only move is "call")
				&& !tables[tableId].otherPlayersAreAllIn()
                ) {
                    amount = $u.round(amount);
                    if (amount && isFinite(amount)) {
                        amount -= tables[tableId].seats[activeSeat].public.bet;
                        if (amount <= tables[tableId].seats[activeSeat].public.chipsInPlay) {
                        // Sending the callback first, because the next functions may need to send data to the same player, that shouldn't be overwritten
                            log.info('[#' + tableId + ']' + players[socket.id].public.name + ' raise ' + amount);
                            callback({ 'success': true });
                            // The amount should not include amounts previously betted
                            tables[tableId].playerRaised(amount);
                        }
                    }
                }
            }
        } catch (e){
            console.log(e);
            log.error('rise: ' + e);
        }
    });

    /**
	 * When a message from a player is sent
	 * @param string message
	 */
    socket.on('sendMessage', function(message) {
        try {
            message = message.trim();
            if (message && players[socket.id] && players[socket.id].room) {
                socket.broadcast.to('table-' + players[socket.id].room).emit('receiveMessage', { 'message': htmlEntities(message), 'sender': players[socket.id].public.name });
            }
        } catch (e){
            console.log(e);
            log.error('sendMessage' + e);
        }
    });
});

$u.removePlayer = socket =>{
    const player = players[socket.id];
    if (typeof player !== 'undefined') {
        console.log('Disconnect>', player.public.name, player.sittingOnTable, player.seat);
        // return;
        // If the player was sitting on a table
        // player.onDisconnect(()=>{
        if (player.sittingOnTable !== false && typeof tables[player.sittingOnTable] !== 'undefined' && socket.id === player.socket.id) {
            console.log('RM TABLE', player.public.name);
            // The seat on which the player was sitting
            var seat = player.seat;
            // The table on which the player was sitting
            var tableId = player.sittingOnTable;
            // Remove the player from the seat
            tables[tableId].playerLeft(seat);
        }
        // Remove the player object from the players array
        delete players[socket.id];
        // });
    }
};

/**
 * Event emitter function that will be sent to the table objects
 * Tables use the eventEmitter in order to send events to the client
 * and update the table data in the ui
 * @param string tableId
 */
var eventEmitter = function(tableId) {
    return function (eventName, eventData) {
        io.sockets.in('table-' + tableId).emit(eventName, eventData);
    };
};

/**
 * Changes certain characters in a string to html entities
 * @param string str
 */
function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

$u.createTables(tables, eventEmitter, Table);
Store.tables = tables;

function getSSLFiles(){
    const fs = require('fs');
    if (!fs.existsSync('./.ssl')){
        return false;
    }
    log.info('Is SSL');
    let key = null;
    let cert = null;
    fs.readdirSync('./.ssl').forEach(f=>{
        if (f.includes('.key')){
            key = fs.readFileSync('./ssl/' + f);
        } else if (f.includes('.crt')){
            cert = fs.readFileSync('./ssl/' + f);
        }
    });
    if (key && cert){
        return {key, cert};
    }
    return false;
}

$u.init({players, tables, eventEmitter});
// require('./tests');

