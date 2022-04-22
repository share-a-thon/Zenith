var dc, pc = new RTCPeerConnection();
pc.onaddstream = e => v2.srcObject = e.stream;
pc.ondatachannel = e => dcInit(dc = e.channel);
pc.oniceconnectionstatechange = e => log(pc.iceConnectionState);

var haveGum = navigator.mediaDevices.getUserMedia({video:true, audio:true})
  .then(stream => pc.addStream(v1.srcObject = stream)).catch(log);

function dcInit() {
  dc.onopen = () => log("Chat!");
  dc.onmessage = e => {
		process(JSON.parse(e.data));
  }
}

function process(m) {
	switch(m.type) {
		case 'chat':
			log(m.val);
			break;
		case 'file':
			saveFile(m.name, m.val);
			break;
		default:
			console.log("unknown message")
			console.log(m)
	}
}

function createOffer() {
  button.disabled = true;
  dcInit(dc = pc.createDataChannel("chat"));
  haveGum.then(() => pc.createOffer()).then(d => pc.setLocalDescription(d))
    .catch(log);
  pc.onicecandidate = e => {
    if (e.candidate) return;
    offer.value = bytesToBase64(pako.gzip(pc.localDescription.sdp));
    offer.select();
    answer.placeholder = "Paste answer here";
  };
};

offer.onkeypress = e => {
  if (!enterPressed(e) || pc.signalingState != "stable") return;
  button.disabled = offer.disabled = true;
  var desc = new RTCSessionDescription({ type:"offer", sdp: pako.ungzip(base64ToBytes(offer.value), {to: 'string'}) });
  pc.setRemoteDescription(desc)
    .then(() => pc.createAnswer()).then(d => pc.setLocalDescription(d))
    .catch(log);
  pc.onicecandidate = e => {
    if (e.candidate) return;
    answer.focus();
    answer.value = bytesToBase64(pako.gzip(pc.localDescription.sdp));
    answer.select();
  };
};

answer.onkeypress = e => {
  if (!enterPressed(e) || pc.signalingState != "have-local-offer") return;
  answer.disabled = true;
  var desc = new RTCSessionDescription({ type:"answer", sdp: pako.ungzip(base64ToBytes(answer.value), {to: 'string'}) });
  pc.setRemoteDescription(desc).catch(log);
};

chat.onkeypress = e => {
  if (!enterPressed(e)) return;
  dc.send(JSON.stringify({type: 'chat', val: chat.value}));
  log(chat.value);
  chat.value = "";
};

file.onchange = e => {
	file = e.target.files[0];
    var r = new FileReader();
    r.onload = function(e) {
      sendFile(e.target.result, file.name);
    }
    r.readAsText(file);
}

function sendFile(file, name) {
    dc.send(JSON.stringify({type: "file", name: name, val: btoa(unescape(encodeURIComponent(file)))}));
}

function saveFile(name, cont) {
	console.log(cont);
	var blob = new Blob([decodeURIComponent(escape(atob(cont)))], {
		type: "application/octet-stream"
	});
	saveAs(blob, name);
}

var enterPressed = e => e.keyCode == 13;
var log = msg => div.innerHTML += "<p>" + msg + "</p>";
