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


window.isFullScreen = false;
//Запустить отображение в полноэкранном режиме
window.launchFullScreen = (element) => {
    window.isFullScreen = true;
    element = element || document.documentElement;
    if (element.requestFullScreen) {
        element.requestFullScreen();
    } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
    } else if (element.webkitRequestFullScreen) {
        element.webkitRequestFullScreen();
    }
};

// Выход из полноэкранного режима
window.cancelFullscreenCustom = () => {
    window.isFullScreen = false;
    if (document.cancelFullScreen) {
        document.cancelFullScreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if (document.webkitCancelFullScreen) {
        document.webkitCancelFullScreen();
    }
};

window.toggleFullScreen = () => {
    if (window.isFullScreen) {
        return window.cancelFullscreenCustom()
    }
    window.launchFullScreen();
};

export default {
    throttle
};

