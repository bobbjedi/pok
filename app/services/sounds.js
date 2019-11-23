/**
 * Returns functions that play the sounds of the application
 * @return object
 */
app.factory('sounds', ['$rootScope', function ($rootScope) {
    let isSound;
    $rootScope.$watch('settings.sound', v=> {
        isSound = v;
    });
    var foldSound = document.getElementById("fold-sound"),
        checkSound = document.getElementById("check-sound"),
        callSound = document.getElementById("call-sound"),
        betSound = document.getElementById("bet-sound"),
        myStep = document.getElementById("my-step-sound"),
        raiseSound = document.getElementById("raise-sound");

    // myStep.volume = 0.1;

    return {
        playFoldSound: function () {
            if (!isSound) {
                return;
            }
            foldSound.play();
        },
        playCheckSound: function () {
            if (!isSound) {
                return;
            }
            checkSound.play();
        },
        playCallSound: function () {
            if (!isSound) {
                return;
            }
            callSound.play();
        },
        playBetSound: function () {
            if (!isSound) {
                return;
            }
            betSound.play();
        },
        playRaiseSound: function () {
            if (!isSound) {
                return;
            }
            raiseSound.play();
        },
        playMyStepSound: function () {
            if (!isSound) {
                return;
            }
            myStep.play();
        }
    };
}]);
