'use strict';

function trace(arg) {
    var now = (window.performance.now() / 1000).toFixed(3);
    console.log(now + ': ', arg);
}

// UI Element Value
var vid1 = document.querySelector('#vid1');
var vid2 = document.querySelector('#vid2');
var btn_start = document.querySelector('#btn_start');
var roomId = document.querySelector('#room_id');

btn_start.addEventListener('click', onStart);
// ---------------------------------------------------------------------------------
// Value
var local_peer = null;
var localstream = null;
var SIGNAL_SERVER_HTTP_URL = 'https://ssjf409-05-svr-express.herokuapp.com';
var SIGNAL_SERVER_WS_URL = 'wss://ssjf409-05-svr-express.herokuapp.com';
// ---------------------------------------------------------------------------------
function cbGotStream(stream) {
    trace('Received local stream');
    localstream = stream;
    vid1.srcObject = stream;
}

navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true
    })
    .then(cbGotStream)
    .catch(function (e) {
        alert('getUserMedia() error: ' + e);
    });

function cbGotRemoteStream(evt) {
    trace('## Received remote stream try');
    if (vid2.srcObject !== evt.streams[0]) {
        vid2.srcObject = evt.streams[0];
        trace('## Received remote stream success');
    }
}

function onWsMessage(messageEvt) {
    console.info(messageEvt);

    var obj = JSON.parse(messageEvt.data);
    if (obj.code == '99') {
        alert(obj.msg);
    }
    else if (obj.code == '01') {
        // start
        console.info('start in onWsMessage');
        onOffer();
    }
    else if (obj.code == '00') {
        receiveAnswer(obj.msg);
    }    
    else {
        alert('unknown error in onWsMessage');
    }    
}

function onStart() {

    var url = SIGNAL_SERVER_WS_URL + '/room/' + roomId.value;
    g_mc_ws_component.connect(url, onWsMessage);

    var cfg = {
        iceTransportPolicy: "all", // set to "relay" to force TURN.
        iceServers: [
        ]
    };
    // cfg.iceServers.push({urls: "stun:stun.l.google.com:19302"});

    local_peer = new RTCPeerConnection(cfg);
    local_peer.onicecandidate = function (evt) {
        cbIceCandidate(local_peer, evt);
    };
    local_peer.ontrack = cbGotRemoteStream;

    localstream.getTracks().forEach(
        function (track) {
            local_peer.addTrack(
                track,
                localstream
            );
        }
    );

    trace('## start success = create RTCPeerConnection and set callback ');
}

function onOffer() {
    var offerOptions = {
        offerToReceiveAudio: 1,
        offerToReceiveVideo: 1
    };

    local_peer.createOffer(
        offerOptions
    ).then(
        cbCreateOfferSuccess,
        cbCreateOfferError
    );

    trace('## createOffer success');
}

function receiveAnswer(sdpString) {
    trace('receiveAnswer');
    var descObject = {
        type: 'answer',
        sdp: sdpString
    };
    local_peer.setRemoteDescription(descObject);
}

function cbCreateOfferError(error) {
    trace('Failed to create session description: ' + error.toString());
    stop();
}

function cbCreateOfferSuccess(desc) {
    console.info(desc);

    local_peer.setLocalDescription(desc).then(
        cbSetLocalDescriptionSuccess,
        cbSetLocalDescriptionError
    );
}
function cbSetLocalDescriptionSuccess() {
    trace('localDescription success.');
}
function cbSetLocalDescriptionError(error) {
    trace('Failed to set setLocalDescription: ' + error.toString());
    stop();
}

function stop() {
    if (local_peer != null)
        local_peer.close();
    local_peer = null;
}

function cbIceCandidate(pc, event) {
    if (event.candidate)
        cbCheckIceCandidateAdded(event.candidate);
    else
        cbCheckIceCandidateCompleted(pc.localDescription);
}
function cbCheckIceCandidateAdded(candidateObject) {
    trace('cbCheckIceCandidateAdded');
    // ICE candidate ??? ???????????? ???????????? ?????? ????????? ??? ??? ??? ??????. 
    // ??? ????????? ????????? ???????????? sdp ??? ???????????? ????????? ????????? ???????????? ?????? ?????????.
}

function cbCheckIceCandidateCompleted(descObject) {
    trace('cbCheckIceCandidateCompleted');
    g_mc_ws_component.sendMessage(descObject.sdp);
}


var app = new Vue({
    el: '#app',
    data: {
        rooms : [
        ]
    },
    methods: {
      onClickRoom : function (id) {
        window.roomId.value = id;
      },
      onUpdateRoomList : function(event) {
          this.$http.get(window.SIGNAL_SERVER_HTTP_URL + '/roomlist').then(response => {
            this.rooms = response.body;
          }, response => {
            alert(response);
          });          
      }
    }
  })