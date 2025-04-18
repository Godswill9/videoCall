const socket = io("/");
const chatInputBox = document.getElementById("chat_message");
const all_messages = document.getElementById("all_messages");
const main__chat__window = document.getElementById("main__chat__window");
const videoGrid = document.getElementById("video-grid");
const myVideo = document.createElement("video");
myVideo.muted = true;

let myVideoStream;

var peer = new Peer(undefined, {
  host: "videocall-ado8.onrender.com",
  port: 443,
  path: "/peerjs",
  secure: true,
});

navigator.mediaDevices.getUserMedia({
  video: { width: 640, height: 360 },
  audio: true,
})
.then((stream) => {
  myVideoStream = stream;
  addVideoStream(myVideo, stream, "Me");

  peer.on("call", (call) => {
    call.answer(stream);
    const video = document.createElement("video");
    call.on("stream", (userVideoStream) => {
      addVideoStream(video, userVideoStream, call.peer);
    });
  });

  socket.on("user-connected", (userId) => {
    connectToNewUser(userId, stream);
  });

  document.addEventListener("keydown", (e) => {
    if (e.which === 13 && chatInputBox.value != "") {
      socket.emit("message", chatInputBox.value);
      chatInputBox.value = "";
    }
  });

  socket.on("createMessage", (msg) => {
    let li = document.createElement("li");
    li.innerHTML = msg;
    all_messages.append(li);
    main__chat__window.scrollTop = main__chat__window.scrollHeight;
  });
});

peer.on("call", function (call) {
  navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then((stream) => {
      call.answer(stream);
      const video = document.createElement("video");
      call.on("stream", function (remoteStream) {
        addVideoStream(video, remoteStream, call.peer);
      });
    })
    .catch((err) => {
      console.log("Failed to get local stream", err);
    });
});

peer.on("open", (id) => {
  socket.emit("join-room", ROOM_ID, id);
});

// Connect to new user
const connectToNewUser = (userId, streams) => {
  var call = peer.call(userId, streams);
  const video = document.createElement("video");

  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream, userId);
  });
};

// Add video stream with user label
const addVideoStream = (videoEl, stream, userId = "User") => {
  const videoWrapper = document.createElement("div");
  videoWrapper.classList.add("video-container");
  videoWrapper.style.position = "relative";
  videoWrapper.style.border = "1px solid #444";
  videoWrapper.style.borderRadius = "10px";
  videoWrapper.style.overflow = "hidden";
  videoWrapper.style.backgroundColor = "#000";

  const userLabel = document.createElement("div");
  userLabel.innerText = userId;
  userLabel.style.position = "absolute";
  userLabel.style.top = "0";
  userLabel.style.left = "0";
  userLabel.style.width = "100%";
  userLabel.style.padding = "5px 10px";
  userLabel.style.backgroundColor = "rgba(0,0,0,0.6)";
  userLabel.style.color = "white";
  userLabel.style.fontWeight = "bold";
  userLabel.style.fontSize = "14px";
  userLabel.style.zIndex = "10";

  const userClosedText = document.createElement("div");
  userClosedText.innerText = "User closed video";
  userClosedText.style.visibility = "hidden";
  userClosedText.style.position = "absolute";
  userClosedText.style.top = "0";
  userClosedText.style.left = "0";
  userClosedText.style.width = "100%";
  userClosedText.style.height = "100%";
  userClosedText.style.display = "flex";
  userClosedText.style.justifyContent = "center";
  userClosedText.style.alignItems = "center";
  userClosedText.style.color = "white";
  userClosedText.style.fontSize = "1.5rem";
  userClosedText.style.fontWeight = "bold";
  userClosedText.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
  userClosedText.style.pointerEvents = "none";

  videoEl.srcObject = stream;
  videoEl.setAttribute("data-user-id", userId);
  videoEl.style.width = "100%";
  videoEl.style.height = "auto";

  videoEl.addEventListener("loadedmetadata", () => {
    videoEl.play();
  });

  videoWrapper.appendChild(userLabel);
  videoWrapper.appendChild(videoEl);
  videoWrapper.appendChild(userClosedText);

  videoGrid.append(videoWrapper);
};

// Mute/Unmute video
const playStop = () => {
  if (!myVideoStream || !myVideoStream.getVideoTracks().length) return;
  const videoTrack = myVideoStream.getVideoTracks()[0];
  const videoElement = videoGrid.getElementsByTagName("video")[0];
  const existingOverlay = videoElement?.parentElement?.querySelector("div");

  if (videoTrack.enabled) {
    videoTrack.enabled = false;
    setPlayVideo();
  } else {
    videoTrack.enabled = true;
    if (existingOverlay) existingOverlay.style.visibility = "hidden";
    videoElement.style.visibility = "visible";
    setStopVideo();
  }
};

// Mute/Unmute audio
const muteUnmute = () => {
  const audioTrack = myVideoStream.getAudioTracks()[0];
  if (audioTrack.enabled) {
    audioTrack.enabled = false;
    setUnmuteButton();
  } else {
    audioTrack.enabled = true;
    setMuteButton();
  }
};

// Button icon setters
const setPlayVideo = () => {
  const html = `<i class="unmute fa fa-pause-circle"></i>
  <span class="unmute">Resume Video</span>`;
  document.getElementById("playPauseVideo").innerHTML = html;
};

const setStopVideo = () => {
  const html = `<i class="fa fa-video-camera"></i>
  <span>Pause Video</span>`;
  document.getElementById("playPauseVideo").innerHTML = html;
};

const setUnmuteButton = () => {
  const html = `<i class="unmute fa fa-microphone-slash"></i>
  <span class="unmute">Unmute</span>`;
  document.getElementById("muteButton").innerHTML = html;
};

const setMuteButton = () => {
  const html = `<i class="fa fa-microphone"></i>
  <span>Mute</span>`;
  document.getElementById("muteButton").innerHTML = html;
};

// Leave room
const leaveChat = () => {
  socket.emit("leave-room", ROOM_ID);
  socket.disconnect();
  if (myVideoStream) {
    myVideoStream.getTracks().forEach((track) => track.stop());
  }
  while (videoGrid.firstChild) {
    videoGrid.removeChild(videoGrid.firstChild);
  }
  window.location.href = "/goodbye.html";
};

// Handle user disconnect
socket.on("user-disconnected", (userId) => {
  console.log(`User disconnected: ${userId}`);
  removeVideoStream(userId);
});

const removeVideoStream = (userId) => {
  const videos = document.getElementsByTagName("video");
  for (let i = 0; i < videos.length; i++) {
    if (videos[i].getAttribute("data-user-id") === userId) {
      const wrapper = videos[i].parentElement;
      videoGrid.removeChild(wrapper);
      break;
    }
  }

  const totalUsers = document.getElementsByTagName("video").length;
  if (totalUsers > 1) {
    for (let index = 0; index < totalUsers; index++) {
      document.getElementsByTagName("video")[index].style.width = 100 / totalUsers + "%";
    }
  }

  window.location.reload();
};
