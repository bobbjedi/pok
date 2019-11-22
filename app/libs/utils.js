import _ from 'underscore';
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



export default {
    throttle,
    round(n){
        if (!_.isNumber(n)){
            return 0.00; 
        }
        return Number(n.toFixed(2));
    }
};

