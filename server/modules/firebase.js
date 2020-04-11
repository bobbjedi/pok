// AAAAql1kZ74:APA91bExkQKMu6Ayhba_hvZG92p8hbyurmgvSHgz8jmHfFWk-BxtdMA1qZCtfMs_5UbaAJk7IB4Qqc-PGZTHEn5oiU75YYBs0ihcneYMnlegf9GstYc9wSF0xI6KL_GC07oL8l0IhRai
// 731711301566
const fetch = require('node-fetch');
var key = 'AAAAql1kZ74:APA91bExkQKMu6Ayhba_hvZG92p8hbyurmgvSHgz8jmHfFWk-BxtdMA1qZCtfMs_5UbaAJk7IB4Qqc-PGZTHEn5oiU75YYBs0ihcneYMnlegf9GstYc9wSF0xI6KL_GC07oL8l0IhRai';
var to = 'fWGm-hj5l-MEEGTnJSX_ld:APA91bH8fC_nU2Rz0GIrHkLBona8S_upt_PQ1sAvhYmOF-gz-7chBb3p5oIY9B8AaCPER5lMjKwgQgIzXBGsvjMu2qy2ntDXt2LgSHcGGiDsggxZJN4KEEF0ZqhRfqExxMJDbRGYZH7W';

setTimeout(()=>{
    var notification = {
        'title': 'Турнир RF-POKER!',
        'body': 'Открыта регистрация на турнир, BUY IN: 105 BIP',
        'icon': '/favicon/apple-icon-57x57.png'
    };
    
    fetch('https://fcm.googleapis.com/fcm/send', {
        'method': 'POST',
        'headers': {
            'Authorization': 'key=' + key,
            'Content-Type': 'application/json'
        },
        'body': JSON.stringify({
            'notification': notification,
            'registration_ids': [to]
        })
    }).then(function (response) {
        console.log(response);
    }).catch(function (error) {
        console.error(error);
    });

}, 1000);