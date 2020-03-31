const {easyrtc} = window;
delete window.easyrtc;
const maxCALLERS = 15;

function callEverybodyElse(roomName, otherPeople, c) {
    console.log({roomName, otherPeople, c});
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
let parent;
export default $root => {
    parent = document.getElementById('voice-chat');
    let num = maxCALLERS + 1;
    const boxes = [];
    let boxedEl = '';
    while (num--){
        const id = 'box' + num;
        num && boxes.push(id);
        boxedEl += `<video  ${!num ? ' muted="muted" ' : 'volume="1" class="incoming-voice" '}id="${id}" autoplay="autoplay" visible="hidden" playsinline="playsinline"></video>`;
    }
    parent.innerHTML = boxedEl;
    // easyrtc.enableDebug(true);
    easyrtc.setSocketUrl('', {});
    easyrtc.setRoomOccupantListener(callEverybodyElse);
    adapter.videoOff();
    
    window.initVC = () => setTimeout(() => {
        $root.user.login && easyrtc.setUsername($root.user.login);
        const {voiceChat} = $root.settings;
        easyrtc.easyApp('poker.multiparty', 'box0', boxes, () => {
            if (!$root.settings.voiceChat.isAllowed){
                adapter.mic(voiceChat.mic);
                $root.settings.voiceChat.isAllowed = true;
            }
        }, e =>console.log('Error:' + e));
        easyrtc.setDisconnectListener(() => easyrtc.showError('LOST-CONNECTION', 'Lost connection to signaling server'));
        easyrtc.setOnCall(function (easyrtcid, slot) {
            console.log('Connected', easyrtcid, slot);
            console.log("getConnection count=" + easyrtc.getConnectionCount());
        });
        console.log(voiceChat);
        
        adapter.mic(voiceChat.mic);
        adapter.audio(voiceChat.audio);

        $root.$watch('settings.voiceChat', s =>{
            console.log(s);
            adapter.mic(s.mic);
            adapter.audio(s.audio);
        }, true);
        
    }, 500);
    // window.initVC();
    const driver = {
        toggleMic() {
            $root.settings.voiceChat.mic = !$root.settings.voiceChat.mic;
            $root.$digest();
        },
        toggleAudio() {
            $root.settings.voiceChat.audio = !$root.settings.voiceChat.audio;
            $root.$digest();
        },
        initVC: window.initVC
    };
    return driver;
};

const adapter = {
    videoOff() {
        easyrtc.enableVideo(false);
        easyrtc.enableCamera(false);
    },
    mic(b){
        easyrtc.enableMicrophone(b);
    },
    audio(b){
        parent.querySelectorAll('.incoming-voice').forEach(e => e.volume = Number(b));
    }
};