const socket = io();
const myvideo = document.querySelector("#vd1");
const youvideo = document.querySelector("#recording");
const roomid = params.get("room");
let username;
const chatRoom = document.querySelector(".chat-cont");
const sendButton = document.querySelector(".chat-send");
const sendReact = document.querySelector(".send-react");
const messageField = document.querySelector(".chat-input");
const videoContainer = document.querySelector("#vcont");
const overlayContainer = document.querySelector("#overlay");
const continueButt = document.querySelector(".continue-name");
const nameField = document.querySelector("#name-field");
const videoButt = document.querySelector(".novideo");
const audioButt = document.querySelector(".audio");
const cutCall = document.querySelector(".cutcall");
const screenShareButt = document.querySelector(".screenshare");
const reactButt = document.querySelector(".react");
const whiteboardButt = document.querySelector(".board-icon");
const recordButt = document.querySelector(".record");
const stopButt = document.querySelector(".stop-record");
/*const downloadButt = document.querySelector("#downloadButt");*/
const fileButton = document.querySelector(".file-send");
const fileInput = document.querySelector("#file-input");
const fileField = document.querySelector("#message-field");
const whiteboardCont = document.querySelector(".whiteboard-cont");
const canvas = document.querySelector("#whiteboard");
const ctx = canvas.getContext("2d");

//blur start

//blur end
//whiteboard js start
let boardVisible = false;

whiteboardCont.style.visibility = "hidden";

let isDrawing = 0;
let x = 0;
let y = 0;
let color = "black";
let drawsize = 3;
let colorRemote = "black";
let drawsizeRemote = 3;

function fitToContainer(canvas) {
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
}

fitToContainer(canvas);

//getCanvas call is under join room call
socket.on("getCanvas", (url) => {
  let img = new Image();
  img.onload = start;
  img.src = url;

  function start() {
    ctx.drawImage(img, 0, 0);
  }

  console.log("got canvas", url);
});

function setColor(newcolor) {
  color = newcolor;
  drawsize = 3;
}

function setEraser() {
  color = "white";
  drawsize = 10;
}

//might remove this
function reportWindowSize() {
  fitToContainer(canvas);
}

window.onresize = reportWindowSize;
//

function clearBoard() {
  if (
    window.confirm(
      "Are you sure you want to clear board? This cannot be undone"
    )
  ) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit("store canvas", canvas.toDataURL());
    socket.emit("clearBoard");
  } else return;
}

socket.on("clearBoard", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

function draw(newx, newy, oldx, oldy) {
  ctx.strokeStyle = color;
  ctx.lineWidth = drawsize;
  ctx.beginPath();
  ctx.moveTo(oldx, oldy);
  ctx.lineTo(newx, newy);
  ctx.stroke();
  ctx.closePath();

  socket.emit("store canvas", canvas.toDataURL());
}

function drawRemote(newx, newy, oldx, oldy) {
  ctx.strokeStyle = colorRemote;
  ctx.lineWidth = drawsizeRemote;
  ctx.beginPath();
  ctx.moveTo(oldx, oldy);
  ctx.lineTo(newx, newy);
  ctx.stroke();
  ctx.closePath();
}

canvas.addEventListener("mousedown", (e) => {
  x = e.offsetX;
  y = e.offsetY;
  isDrawing = 1;
});

canvas.addEventListener("mousemove", (e) => {
  if (isDrawing) {
    draw(e.offsetX, e.offsetY, x, y);
    socket.emit("draw", e.offsetX, e.offsetY, x, y, color, drawsize);
    x = e.offsetX;
    y = e.offsetY;
  }
});

window.addEventListener("mouseup", (e) => {
  if (isDrawing) {
    isDrawing = 0;
  }
});

socket.on("draw", (newX, newY, prevX, prevY, color, size) => {
  colorRemote = color;
  drawsizeRemote = size;
  drawRemote(newX, newY, prevX, prevY);
});

whiteboardButt.addEventListener("click", () => {
  if (boardVisible) {
    whiteboardCont.style.visibility = "hidden";
    boardVisible = false;
  } else {
    whiteboardCont.style.visibility = "visible";
    boardVisible = true;
  }
});

//whiteboard js end

let videoAllowed = 1;
let audioAllowed = 1;

let micInfo = {};
let videoInfo = {};

let videoTrackReceived = {};

let mymuteicon = document.querySelector("#my-mute-icon");
mymuteicon.style.visibility = "hidden";

let myvideooff = document.querySelector("#myvideooff");
myvideooff.style.visibility = "hidden";

const configuration = { iceServers: [{ urls: "stun:stun.stunprotocol.org" }] };

const mediaConstraints = { video: true, audio: true };

let connections = {};
let cName = {};
let audioTrackSent = {};

let videoTrackSent = {};

let mystream, myscreenshare;

document.querySelector(".room-code").innerHTML = `${roomid}`;

function CopyClassText() {
  var textToCopy = document.querySelector(".room-code");
  var currentRange;
  if (document.getSelection().rangeCount > 0) {
    currentRange = document.getSelection().getRangeAt(0);
    window.getSelection().removeRange(currentRange);
  } else {
    currentRange = false;
  }

  var CopyRange = document.createRange();
  CopyRange.selectNode(textToCopy);
  window.getSelection().addRange(CopyRange);
  document.execCommand("copy");

  window.getSelection().removeRange(CopyRange);

  if (currentRange) {
    window.getSelection().addRange(currentRange);
  }

  document.querySelector(".copycode-button").textContent = "Kopyalandı!";
  setTimeout(() => {
    document.querySelector(".copycode-button").textContent = "Kodu kopyala";
  }, 5000);
}

continueButt.addEventListener("click", () => {
  if (nameField.value == "") return;

  username = nameField.value;
  overlayContainer.style.visibility = "hidden";
  document.querySelector("#my-name").innerHTML = `${username} (Siz)`;
  socket.emit("join room", roomid, username);
});

nameField.addEventListener("keyup", function (event) {
  if (event.keyCode === 13) {
    event.preventDefault();
    continueButt.click();
  }
});

socket.on("user count", (count) => {
  if (count > 1) {
    videoContainer.className = "video-cont";
  } else {
    videoContainer.className = "video-cont-single";
  }
});

let peerConnection;

function handleGetUserMediaError(e) {
  switch (e.name) {
    case "NotFoundError":
      alert(
        "Kamera veya mikrofon olmadığı için arama açılamıyor" + "were found."
      );
      break;
    case "SecurityError":
    case "PermissionDeniedError":
      break;
    default:
      alert(
        "Kameranız ve/veya mikrofonunuz açılırken hata oluştu: " + e.message
      );
      break;
  }
}

function reportError(e) {
  console.log(e);
  return;
}

function startCall() {
  navigator.mediaDevices
    .getUserMedia(mediaConstraints)
    .then((localStream) => {
      myvideo.srcObject = localStream;
      myvideo.muted = true;

      localStream.getTracks().forEach((track) => {
        for (let key in connections) {
          connections[key].addTrack(track, localStream);
          if (track.kind === "audio") audioTrackSent[key] = track;
          else videoTrackSent[key] = track;
        }
      });
    })
    .catch(handleGetUserMediaError);
}

function handleVideoOffer(offer, sid, cname, micinf, vidinf) {
  cName[sid] = cname;
  console.log("video offered recevied");
  micInfo[sid] = micinf;
  videoInfo[sid] = vidinf;
  connections[sid] = new RTCPeerConnection(configuration);

  connections[sid].onicecandidate = function (event) {
    if (event.candidate) {
      console.log("icecandidate fired");
      socket.emit("new icecandidate", event.candidate, sid);
    }
  };

  connections[sid].ontrack = function (event) {
    if (!document.getElementById(sid)) {
      console.log("track event fired");
      let vidCont = document.createElement("div");
      let newvideo = document.createElement("video");
      let name = document.createElement("div");
      let muteIcon = document.createElement("div");
      let videoOff = document.createElement("div");
      videoOff.classList.add("video-off");
      muteIcon.classList.add("mute-icon");
      name.classList.add("name-tag");
      name.innerHTML = `${cName[sid]}`;
      vidCont.id = sid;
      muteIcon.id = `mute${sid}`;
      videoOff.id = `vidoff${sid}`;
      muteIcon.innerHTML = `<i class="fas fa-microphone-slash"></i>`;
      videoOff.innerHTML = "Video Off";
      vidCont.classList.add("video-box");
      newvideo.classList.add("video-frame");
      newvideo.autoplay = true;
      newvideo.playsinline = true;
      newvideo.id = `video${sid}`;
      newvideo.srcObject = event.streams[0];

      if (micInfo[sid] == "on") muteIcon.style.visibility = "hidden";
      else muteIcon.style.visibility = "visible";

      if (videoInfo[sid] == "on") videoOff.style.visibility = "hidden";
      else videoOff.style.visibility = "visible";

      vidCont.appendChild(newvideo);
      vidCont.appendChild(name);
      vidCont.appendChild(muteIcon);
      vidCont.appendChild(videoOff);

      videoContainer.appendChild(vidCont);
    }
  };

  connections[sid].onremovetrack = function (event) {
    if (document.getElementById(sid)) {
      document.getElementById(sid).remove();
      console.log("bir parça kaldırıldı");
    }
  };

  connections[sid].onnegotiationneeded = function () {
    connections[sid]
      .createOffer()
      .then(function (offer) {
        return connections[sid].setLocalDescription(offer);
      })
      .then(function () {
        socket.emit("video-offer", connections[sid].localDescription, sid);
      })
      .catch(reportError);
  };

  let desc = new RTCSessionDescription(offer);

  connections[sid]
    .setRemoteDescription(desc)
    .then(() => {
      return navigator.mediaDevices.getUserMedia(mediaConstraints);
    })
    .then((localStream) => {
      localStream.getTracks().forEach((track) => {
        connections[sid].addTrack(track, localStream);
        console.log("added local stream to peer");
        if (track.kind === "audio") {
          audioTrackSent[sid] = track;
          if (!audioAllowed) audioTrackSent[sid].enabled = false;
        } else {
          videoTrackSent[sid] = track;
          if (!videoAllowed) videoTrackSent[sid].enabled = false;
        }
      });
    })
    .then(() => {
      return connections[sid].createAnswer();
    })
    .then((answer) => {
      return connections[sid].setLocalDescription(answer);
    })
    .then(() => {
      socket.emit("video-answer", connections[sid].localDescription, sid);
    })
    .catch(handleGetUserMediaError);
}

function handleNewIceCandidate(candidate, sid) {
  console.log("new candidate recieved");
  var newcandidate = new RTCIceCandidate(candidate);

  connections[sid].addIceCandidate(newcandidate).catch(reportError);
}

function handleVideoAnswer(answer, sid) {
  console.log("answered the offer");
  const ans = new RTCSessionDescription(answer);
  connections[sid].setRemoteDescription(ans);
}
//screen recorder start
screenShareButt.addEventListener("click", () => {
  screenShareToggle();
});

let screenshareEnabled = false;
let mediaRecorder;

function screenShareToggle() {
  let screenMediaPromise;
  if (!screenshareEnabled) {
    if (navigator.getDisplayMedia) {
      screenMediaPromise = navigator.getDisplayMedia({ video: true });
    } else if (navigator.mediaDevices.getDisplayMedia) {
      screenMediaPromise = navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
    } else {
      screenMediaPromise = navigator.mediaDevices.getUserMedia({
        video: { mediaSource: "screen" },
      });
    }
  } else {
    screenMediaPromise = navigator.mediaDevices.getUserMedia({ video: true });
  }

  screenMediaPromise
    .then((myscreenshare) => {
      screenshareEnabled = !screenshareEnabled;
      for (let key in connections) {
        const sender = connections[key]
          .getSenders()
          .find((s) => (s.track ? s.track.kind === "video" : false));
        sender.replaceTrack(myscreenshare.getVideoTracks()[0]);
      }

      const audioPromise = navigator.mediaDevices.getUserMedia({ audio: true });
      audioPromise
        .then((myaudio) => {
          const audioTrack = myaudio.getAudioTracks()[0];
          const screenTrack = myscreenshare.getVideoTracks()[0];
          const combinedStream = new MediaStream([screenTrack, audioTrack]);

          myscreenshare.getVideoTracks()[0].enabled = true;
          const newStream = new MediaStream(combinedStream);
          myvideo.srcObject = newStream;
          myvideo.muted = true;
          mystream = newStream;

          screenShareButt.innerHTML = screenshareEnabled
            ? `<i class="fas fa-desktop"></i><span class="tooltiptext">Stop Share Screen</span>`
            : `<i class="fas fa-desktop"></i><span class="tooltiptext">Share Screen</span>`;

          mediaRecorder = new MediaRecorder(combinedStream);
          const chunks = [];

          mediaRecorder.onstart = function (e) {
            downloadButt.disabled = true;
            chunks.length = 0;
          };

          mediaRecorder.ondataavailable = function (e) {
            chunks.push(e.data);
          };

          mediaRecorder.onstop = function (e) {
            downloadButt.disabled = false;
            const blob = new Blob(chunks, { type: "video/webm" });
            const url = URL.createObjectURL(blob);
            downloadButt.href = url;
            downloadButt.download = "screen-recording.webm";
          };

          mediaRecorder.start();

          myscreenshare.getVideoTracks()[0].onended = function () {
            if (screenshareEnabled) screenShareToggle();
            mediaRecorder.stop();
          };
        })
        .catch((e) => {
          alert("Unable to capture audio:" + e.message);
          console.error(e);
        });
    })
    .catch((e) => {
      alert("Unable to share screen:" + e.message);
      console.error(e);
    });
}
//screen recording end
socket.on("video-offer", handleVideoOffer);

socket.on("new icecandidate", handleNewIceCandidate);

socket.on("video-answer", handleVideoAnswer);

socket.on("join room", async (conc, cnames, micinfo, videoinfo) => {
  socket.emit("getCanvas");
  if (cnames) cName = cnames;

  if (micinfo) micInfo = micinfo;

  if (videoinfo) videoInfo = videoinfo;

  console.log(cName);
  if (conc) {
    await conc.forEach((sid) => {
      connections[sid] = new RTCPeerConnection(configuration);

      connections[sid].onicecandidate = function (event) {
        if (event.candidate) {
          console.log("icecandidate fired");
          socket.emit("new icecandidate", event.candidate, sid);
        }
      };

      connections[sid].ontrack = function (event) {
        if (!document.getElementById(sid)) {
          console.log("track event fired");
          let vidCont = document.createElement("div");
          let newvideo = document.createElement("video");
          let name = document.createElement("div");
          let muteIcon = document.createElement("div");
          let videoOff = document.createElement("div");
          videoOff.classList.add("video-off");
          muteIcon.classList.add("mute-icon");
          name.classList.add("name-tag");
          name.innerHTML = `${cName[sid]}`;
          vidCont.id = sid;
          muteIcon.id = `mute${sid}`;
          videoOff.id = `vidoff${sid}`;
          muteIcon.innerHTML = `<i class="fas fa-microphone-slash"></i>`;
          videoOff.innerHTML = "Video Off";
          vidCont.classList.add("video-box");
          newvideo.classList.add("video-frame");
          newvideo.autoplay = true;
          newvideo.playsinline = true;
          newvideo.id = `video${sid}`;
          newvideo.srcObject = event.streams[0];

          if (micInfo[sid] == "on") muteIcon.style.visibility = "hidden";
          else muteIcon.style.visibility = "visible";

          if (videoInfo[sid] == "on") videoOff.style.visibility = "hidden";
          else videoOff.style.visibility = "visible";

          vidCont.appendChild(newvideo);
          vidCont.appendChild(name);
          vidCont.appendChild(muteIcon);
          vidCont.appendChild(videoOff);

          videoContainer.appendChild(vidCont);
        }
      };

      connections[sid].onremovetrack = function (event) {
        if (document.getElementById(sid)) {
          document.getElementById(sid).remove();
        }
      };

      connections[sid].onnegotiationneeded = function () {
        connections[sid]
          .createOffer()
          .then(function (offer) {
            return connections[sid].setLocalDescription(offer);
          })
          .then(function () {
            socket.emit("video-offer", connections[sid].localDescription, sid);
          })
          .catch(reportError);
      };
    });

    console.log("tüm soketler bağlantılara eklendi");
    startCall();
  } else {
    console.log("birinin katılmasını beklemek");
    navigator.mediaDevices
      .getUserMedia(mediaConstraints)
      .then((localStream) => {
        myvideo.srcObject = localStream;
        myvideo.muted = true;
        mystream = localStream;
      })
      .catch(handleGetUserMediaError);
  }
});

socket.on("remove peer", (sid) => {
  if (document.getElementById(sid)) {
    document.getElementById(sid).remove();
  }

  delete connections[sid];
});

sendButton.addEventListener("click", () => {
  const msg = messageField.value;
  messageField.value = "";
  socket.emit("message", msg, username, roomid);
});

messageField.addEventListener("keyup", function (event) {
  if (event.keyCode === 13) {
    event.preventDefault();
    sendButton.click();
  }
});

socket.on("message", (msg, sendername, time) => {
  chatRoom.scrollTop = chatRoom.scrollHeight;
  chatRoom.innerHTML += `<div class="message">
    <div class="info">
        <div class="username">${sendername}</div>
        <div class="time">${time}</div>
    </div>
    <div class="content">
        ${msg}
    </div>
</div>`;
});
// file sharing start
fileButton.addEventListener("click", () => {
  fileInput.click();
  console.log("hello");
});

fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  console.log(file.name);
  const reader = new FileReader();
  reader.readAsDataURL(file);

  reader.onload = () => {
    socket.emit(
      "file",
      {
        name: file.name,
        type: file.type,
        data: reader.result,
      },
      username,
      roomid
    );
  };
  fileInput.value = "";
});

fileField.addEventListener("keyup", function (event) {
  if (event.keyCode === 13) {
    event.preventDefault();
    fileButton.click();
  }
});

socket.on("file", (file, sendername, time) => {
  chatRoom.scrollTop = chatRoom.scrollHeight;
  chatRoom.innerHTML += `<div class="file">
    <div class="info">
        <div class="username">${sendername}</div>
        <div class="time">${time}</div>
    </div>
    <div class="content">
        <a href="${file.data}" download="${file.name}">${file.name}</a>
    </div>
  </div>`;
});
//file sharing and

//users sharing start
document.getElementById("usersButton").addEventListener("click", () => {
  socket.emit("get users");
  socket.once("user list", (usernames) => {
    console.log(usernames);

    const modal = document.createElement("div");
    modal.classList.add("modal");

    const modalContent = document.createElement("div");
    modalContent.classList.add("modal-content");

    const closeBtn = document.createElement("span");
    closeBtn.classList.add("close");
    closeBtn.innerHTML = "&times;";
    closeBtn.addEventListener("click", () => {
      modal.remove();
    });

    const userListItems = Object.values(usernames).map(
      (username) => `<li style="margin-left:10px">${username}</li>`
    );
    const userListHtml = `<ul>${userListItems.join("")}</ul>`;

    const message = `${
      Object.keys(usernames).length
    } users in the chat\n${userListHtml}`;
    const userMessage = document.createElement("div");
    userMessage.classList.add("message");
    userMessage.innerHTML = message;

    /*chatRoom.appendChild(userMessage);
    chatRoom.scrollTop = chatRoom.scrollHeight;*/
    modalContent.appendChild(closeBtn);
    modalContent.appendChild(userMessage);
    modal.appendChild(modalContent);

    chatRoom.appendChild(modal);

    chatRoom.style.overflow = "hidden";
  });
});
//users sharing end

//show react start
sendReact.addEventListener("click", () => {
  const react = "✋";
  messageField.value = "";
  socket.emit("react", react, username, roomid);
  console.log("hello");
});

socket.on("react", (react, sendername, time) => {
  chatRoom.scrollTop = chatRoom.scrollHeight;
  chatRoom.innerHTML += `<div class="react">
    <div class="info">
        <div class="username">${sendername}</div>
        <div class="time">${time}</div>
    </div>
    <div class="content">
        ${react}
    </div>
</div>`;
});
//show react end

videoButt.addEventListener("click", () => {
  if (videoAllowed) {
    for (let key in videoTrackSent) {
      videoTrackSent[key].enabled = false;
    }
    videoButt.innerHTML = `<i class="fas fa-video-slash"></i>`;
    videoAllowed = 0;
    videoButt.style.backgroundColor = "#b12c2c";

    if (mystream) {
      mystream.getTracks().forEach((track) => {
        if (track.kind === "video") {
          track.enabled = false;
        }
      });
    }

    myvideooff.style.visibility = "visible";

    socket.emit("action", "videooff");
  } else {
    for (let key in videoTrackSent) {
      videoTrackSent[key].enabled = true;
    }
    videoButt.innerHTML = `<i class="fas fa-video"></i>`;
    videoAllowed = 1;
    videoButt.style.backgroundColor = "#556B2F";
    if (mystream) {
      mystream.getTracks().forEach((track) => {
        if (track.kind === "video") track.enabled = true;
      });
    }

    myvideooff.style.visibility = "hidden";

    socket.emit("action", "videoon");
  }
});

audioButt.addEventListener("click", () => {
  if (audioAllowed) {
    for (let key in audioTrackSent) {
      audioTrackSent[key].enabled = false;
    }
    audioButt.innerHTML = `<i class="fas fa-microphone-slash"></i>`;
    audioAllowed = 0;
    audioButt.style.backgroundColor = "#b12c2c";
    if (mystream) {
      mystream.getTracks().forEach((track) => {
        if (track.kind === "audio") track.enabled = false;
      });
    }

    mymuteicon.style.visibility = "visible";

    socket.emit("action", "mute");
  } else {
    for (let key in audioTrackSent) {
      audioTrackSent[key].enabled = true;
    }
    audioButt.innerHTML = `<i class="fas fa-microphone"></i>`;
    audioAllowed = 1;
    audioButt.style.backgroundColor = "	#556B2F";
    if (mystream) {
      mystream.getTracks().forEach((track) => {
        if (track.kind === "audio") track.enabled = true;
      });
    }

    mymuteicon.style.visibility = "hidden";

    socket.emit("action", "unmute");
  }
});

socket.on("action", (msg, sid) => {
  if (msg == "mute") {
    console.log(sid + " muted themself");
    document.querySelector(`#mute${sid}`).style.visibility = "visible";
    micInfo[sid] = "off";
  } else if (msg == "unmute") {
    console.log(sid + " unmuted themself");
    document.querySelector(`#mute${sid}`).style.visibility = "hidden";
    micInfo[sid] = "on";
  } else if (msg == "videooff") {
    console.log(sid + "turned video off");
    document.querySelector(`#vidoff${sid}`).style.visibility = "visible";
    videoInfo[sid] = "off";
  } else if (msg == "videoon") {
    console.log(sid + "turned video on");
    document.querySelector(`#vidoff${sid}`).style.visibility = "hidden";
    videoInfo[sid] = "on";
  }
});

cutCall.addEventListener("click", () => {
  location.href = "/meeting";
});
