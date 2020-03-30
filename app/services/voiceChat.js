const {easyrtc} = window;
// delete window.easyrtc;
const maxCALLERS = 3;

function callEverybodyElse(roomName, otherPeople, c) {
    // console.log({roomName, otherPeople, c});
    easyrtc.setRoomOccupantListener(null); // so we're only called once.

    var list = [];
    var connectCount = 0;
    for (var easyrtcid in otherPeople) {
        list.push(easyrtcid);
    }

    function establishConnection(position) {
        function callSuccess() {
            connectCount++;
            if (connectCount < maxCALLERS && position > 0) {
                establishConnection(position - 1);
            }
        }
        function callFailure(errorCode, errorText) {
            easyrtc.showError(errorCode, errorText);
            if (connectCount < maxCALLERS && position > 0) {
                establishConnection(position - 1);
            }
        }
        easyrtc.call(list[position], callSuccess, callFailure);

    }
    if (list.length > 0) {
        establishConnection(list.length - 1);
    }
}

export default $root => {
    return;
    const parent = document.getElementById('voice-chat');
    let num = maxCALLERS + 1;
    const boxes = [];
    let boxedEl = '';
    while (num--){
        const id = 'box' + num;
        num && boxes.push(id);
        boxedEl += '<video id="' + id + '" autoplay="autoplay" visible="hidden" playsinline="playsinline"></video>';
    }
    parent.innerHTML = boxedEl;
    // easyrtc.enableDebug(true);
    easyrtc.setSocketUrl('', {});
    easyrtc.setRoomOccupantListener(callEverybodyElse);
    adapter.videoOff();

    setTimeout(()=>{
        easyrtc.easyApp('easyrtc.multiparty', 'box0', boxes, () => { });
        easyrtc.setDisconnectListener(() => easyrtc.showError('LOST-CONNECTION', 'Lost connection to signaling server'));

        adapter.soundOff();
        const {voiceChat} = $root.settings;
        adapter.mic(voiceChat.mic);
        adapter.audioReceive(voiceChat.audio);
       
        console.log(voiceChat);
        $root.$watch('settings.voiceChat', s =>{
            console.log(s);
            adapter.mic(s.mic);
            adapter.audioReceive(s.audio);
        }, true);
    }, 500);

    return {
        toggleMic() {
            $root.settings.voiceChat.mic = !$root.settings.voiceChat.mic;
            $root.$digest();
        },
        toggleAudio() {
            $root.settings.voiceChat.audio = !$root.settings.voiceChat.audio;
            $root.$digest();
        }
    };
};

const adapter = {
    videoOff() {
        easyrtc.enableVideo(false);
        easyrtc.enableVideoReceive(false);
        easyrtc.enableCamera(false);
    },
    soundOff(){
        this.mic(false);
        this.audioReceive(false);
    },
    mic(b){
        easyrtc.enableMicrophone(b);
        // easyrtc.enableAudioReceive(b);
    },
    audioReceive(b){
        easyrtc.enableAudio(b);
        // easyrtc.enableAudioReceive(b);
    }
};