const {easyrtc} = window;
// delete window.easyrtc;
const maxCALLERS = 15;


let parent;
export default $root => {
    $root.voiceChatOn = ()=> {
        $root.voiceChat = {
            mic: false,
            audio: true,
        };
        $root.voiceChatIsOn = !$root.voiceChatIsOn;
        window.initVC();
    };

    parent = document.getElementById('voice-chat');
   
    window.initVC = () => {
        console.clear();
        let num = maxCALLERS + 1;
        const boxes = [];
        let boxedEl = '';
        while (num--){
            const id = 'box' + num;
            num && boxes.push(id);
            boxedEl += `<video  ${!num ? ' muted="muted" ' : ' class="incoming-voice" '}id="${id}" autoplay="autoplay" visible="hidden" playsinline="playsinline"></video>`;
        }
        parent.innerHTML = boxedEl;

        easyrtc.enableVideo(false);
        easyrtc.enableCamera(false);

        easyrtc.setSocketUrl('', {});
        easyrtc.setRoomOccupantListener(callEverybodyElse);
        $root.user.login && easyrtc.setUsername($root.user.login);

        easyrtc.easyApp('poker.multiparty', 'box0', boxes, () => {
            // console.log(easyrtc.getLocalStream().getTracks());
            toggleMic(false);
        }, e =>console.log('Error:' + e));

        easyrtc.setDisconnectListener(() => easyrtc.showError('LOST-CONNECTION', 'Lost connection to signaling server'));
        easyrtc.setOnCall(function (easyrtcid, slot) {
            console.log('Connected', easyrtcid, slot);
            console.log("getConnection count=" + easyrtc.getConnectionCount());
        });        

        $root.$watch('voiceChat', v =>{
            console.log(v);
            if (easyrtc.getLocalStream()) {
                const { mic, audio } = v;
                toggleMic(mic);
                toggleSound(audio);
            }
          
            // easyrtc.getLocalStream().addTrack(audioStream);
        }, true);
    };

    const startMic = e=>{
        if (e.target.classList.contains('mic-button')){
            $root.voiceChat.mic = true;
            $root.$digest();
        }
    };

    const stopMic = () => {
        $root.voiceChat && setTimeout(() => {
            $root.voiceChat.mic = false;
            $root.$digest();
        }, 300);
    };
    document.addEventListener('mousedown', startMic);
    document.addEventListener('touchstart', startMic);

    document.addEventListener('mouseup', stopMic);
    document.addEventListener('touchend', stopMic);

};

const toggleMic = b => {
    easyrtc.enableMicrophone(b);
};

const toggleSound = b => {
    console.log('toggleSound', b);
    parent.querySelectorAll('.incoming-voice').forEach(el=>el.volume = b ? 1 : 0.1);
};

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