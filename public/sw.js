/* eslint-disable no-undef */
importScripts('sw-toolbox.js');
// importScripts('firebase-messaging-sw.js');

const precacheFiles = [
    '/index.html',

    '/styles/noty.css',
    '/styles/styles.css',
    '/styles/common.css',
    '/styles/mystyles.css',

    '/images/rotate.gif',
    '/images/preloader.png',
    '/images/table_2.png',
    '/images/dice.gif',
    '/images/deck4.png',
    '/images/deck.png',

    '/audio/fold.wav',
    '/audio/check.wav',
    '/audio/call.wav',
    '/audio/bet.wav',
    '/audio/raise.wav',
    '/audio/my_step3.mp3',
    '/audio/card.mp3',
    '/audio/dices_2.mp3',

    '/socket.io/socket.io.js',
    '/libs/easyrtc.min.js',
    // '/libs/firebase-app.js',
    // '/libs/firebase-messaging.js',
    '/sw-toolbox.js',
    '/dist/build.js'
];
// toolbox.debug = true;
toolbox.precache(precacheFiles);
toolbox.router.get('/images/*', toolbox.cacheFirst);
toolbox.router.get('/audio/*', toolbox.cacheFirst);
toolbox.router.get('/*', toolbox.networkFirst, { networkTimeoutSeconds: 5 });