const {firebase} = window;
// Your web app's Firebase configuration
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
const messaging = firebase.messaging();
export default $root => {
    const enabledPush = () => {
        if ('Notification' in window) {
            subscribe(currentToken => $root.pushToken = currentToken);
        }
    };
    $root.$watch('settings.push', v => {
        if (v) {
            enabledPush();
            // send add 
        } else {
            // send rm
        }
    });
};

messaging.onMessage(({notification}) => new Notification(notification.title, notification));

function subscribe(cb) {
    // запрашиваем разрешение на получение уведомлений
    messaging.requestPermission()
        .then(function () {
            // получаем ID устройства
            messaging.getToken()
                .then(function (currentToken) {
                    console.log({currentToken});
                    cb(currentToken);
                    if (currentToken) {
                        // sendTokenToServer(currentToken);
                    } else {
                        console.warn('Не удалось получить токен.');
                        // setTokenSentToServer(false);
                    }
                })
                .catch(function (err) {
                    console.warn('При получении токена произошла ошибка.', err);
                });
        })
        .catch(function (err) {
            console.warn('Не удалось получить разрешение на показ уведомлений.', err);
        });
}