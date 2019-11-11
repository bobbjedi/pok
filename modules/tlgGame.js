const TelegramBot = require('node-telegram-bot-api');

// replace the value below with the Telegram token you receive from @BotFather
const token = '1009891603:AAGW5bMDjbcdOA_2DKFZV9AYMwK4UVdVjwA';

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});

// ссылка на игру в сети интернет
let url = 'http://swbot.info:36669';

// название игры (то, что указывали в BotFather)
const gameName = 'minterFlappyBird';

// Matches /start
bot.onText(/\/start/, function onPhotoText(msg) {
    bot.sendGame(msg.chat.id, gameName);
});

// Handle callback queries
bot.on('callback_query', function onCallbackQuery(callbackQuery) {
    bot.answerCallbackQuery(callbackQuery.id, { url });
});
