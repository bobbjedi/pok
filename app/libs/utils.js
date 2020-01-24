import _ from 'underscore';
import config from '../../config';

const throttle = (func, ms) => {
    let isThrottled = false,
        savedArgs,
        savedThis;

    function wrapper() {
        if (isThrottled) { // (2)
            savedArgs = arguments;
            savedThis = this;
            return;
        }

        func.apply(this, arguments); // (1)

        isThrottled = true;

        setTimeout(function() {
            isThrottled = false; // (3)
            if (savedArgs) {
                wrapper.apply(savedThis, savedArgs);
                savedArgs = savedThis = null;
            }
        }, ms);
    }

    return wrapper;
};

const upCards = hands =>{
    if (!hands){
        return;
    }
    const interval = config.timeOutBeforeNewGame / hands.length * 1000;
    const allCardsEl = document.querySelectorAll('.card:not(.ng-hide)');
    let currentShows = hands.length;
    
    while (currentShows--){
        const hand = hands[currentShows];
        setTimeout(()=>{
            clearHightLight();
           
            allCardsEl.forEach(el =>{
                const {classList} = el;
               
                hand.forEach(c=>{
                    if (c === 'Ad'){
                        c = 'Ar';
                    }
                    if (classList.contains('card-' + c)){
                        classList.add('card-highlight');
                    }
                });
               
                if (!classList.contains('card-highlight')){
                    classList.add('card-unhighlight');
                }
            });

        }, currentShows * interval);
    }

    setTimeout(clearHightLight, (config.timeOutBeforeNewGame - 1) * 1000);
};

const clearHightLight = () =>{
    document.querySelectorAll('.card').forEach(el =>{
        el.classList.remove('card-highlight', 'card-unhighlight');
    });
};

export default {
    upCards,
    throttle,
    round(n){
        if (!_.isNumber(n)){
            return 0.00; 
        }
        return Number(n.toFixed(2));
    },
    normaliseSeconds(s){
        const min = Math.floor(s / 60);
        let sec = Math.floor(s - min * 60);
        if (sec < 10){
            sec = '0' + sec;
        } 
        return min + 'м. ' + sec + 'сек.'; 
    }
};

