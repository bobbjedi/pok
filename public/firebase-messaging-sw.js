// https://github.com/firebase/quickstart-js/blob/master/messaging/firebase-messaging-sw.js
/* eslint-disable no-undef */
importScripts('libs/firebase-app.js');
importScripts('libs/firebase-messaging.js');

var firebaseConfig = {
    apiKey: "AIzaSyD3ybCOjpDTUQHza_shgEyKZ1lp9zwk2MY",
    authDomain: "royal-flush-poker-842b0.firebaseapp.com",
    databaseURL: "https://royal-flush-poker-842b0.firebaseio.com",
    projectId: "royal-flush-poker-842b0",
    storageBucket: "royal-flush-poker-842b0.appspot.com",
    messagingSenderId: "731711301566",
    appId: "1:731711301566:web:ec401086b87e272f2f3bef"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
console.log('WS push initilize..');
const messaging = firebase.messaging();

messaging.setBackgroundMessageHandler(({notification}) => self.registration.showNotification(notification.title, notification));