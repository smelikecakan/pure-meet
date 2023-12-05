const path = require("path");
const express = require("express");
const http = require("http");
const moment = require("moment");
const socketio = require("socket.io");

const bcrypt = require("bcrypt");
const mysql = require("mysql");
const doenv = require("dotenv");
const hbs = require("hbs");
const cookieParser = require("cookie-parser");

const app = express();
const server = http.createServer(app);

const io = socketio(server);

const fs = require("fs");

doenv.config({
  path: "./.env",
});

const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_DATABASE = process.env.DB_DATABASE;

const db = mysql.createConnection({
  connectionLimit: 100,
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_DATABASE,
});

db.connect((err) => {
  if (err) {
    console.log(err);
  } else {
    console.log("MySQL Connection Success");
  }
});

app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));

const location = path.join(__dirname, "./public");
app.use(express.static(location));
app.set("view engine", "hbs");

app.get("/meeting", (req, res) => {
  res.render("meeting");
});

app.get("/profil", (req, res) => {
  res.render("profil");
});
app.get("/home", (req, res) => {
  res.render("home");
});

const partialsPath = path.join(__dirname, "./views/partials");
hbs.registerPartials(partialsPath);

app.use("/", require("./routes/pages"));
app.use("/auth", require("./routes/auth"));

server.listen(5500, () => {
  console.log("Server started at port: " + 5500);
});

let rooms = {};
let socketroom = {};
let socketname = {};
let micSocket = {};
let videoSocket = {};
let roomBoard = {};

io.on("connect", (socket) => {
  socket.on("join room", (roomid, username) => {
    socket.join(roomid);
    socketroom[socket.id] = roomid;
    socketname[socket.id] = username;
    micSocket[socket.id] = "on";
    videoSocket[socket.id] = "on";

    if (rooms[roomid] && rooms[roomid].length > 0) {
      rooms[roomid].push(socket.id);
      socket
        .to(roomid)
        .emit(
          "message",
          `${username} joined the room.`,
          "Bot",
          moment().format("h:mm a")
        );
      io.to(socket.id).emit(
        "join room",
        rooms[roomid].filter((pid) => pid != socket.id),
        socketname,
        micSocket,
        videoSocket
      );
    } else {
      rooms[roomid] = [socket.id];
      io.to(socket.id).emit("join room", null, null, null, null);
    }

    io.to(roomid).emit("user count", rooms[roomid].length);
  });
  socket.on("get users", () => {
    const roomid = socketroom[socket.id];
    if (roomid && rooms[roomid] && rooms[roomid].length > 0) {
      const usernames = {};
      rooms[roomid].forEach((pid) => {
        usernames[pid] = socketname[pid];
      });
      socket.emit("user list", usernames);
    } else {
      console.log("No users in room");
    }
  });

  // Toplantıda bulunan kullanıcıları toplantı odasına ekle

  socket.on("action", (msg) => {
    if (msg == "mute") micSocket[socket.id] = "off";
    else if (msg == "unmute") micSocket[socket.id] = "on";
    else if (msg == "videoon") videoSocket[socket.id] = "on";
    else if (msg == "videooff") videoSocket[socket.id] = "off";

    socket.to(socketroom[socket.id]).emit("action", msg, socket.id);
  });

  socket.on("video-offer", (offer, sid) => {
    socket
      .to(sid)
      .emit(
        "video-offer",
        offer,
        socket.id,
        socketname[socket.id],
        micSocket[socket.id],
        videoSocket[socket.id]
      );
  });

  socket.on("video-answer", (answer, sid) => {
    socket.to(sid).emit("video-answer", answer, socket.id);
  });

  socket.on("new icecandidate", (candidate, sid) => {
    socket.to(sid).emit("new icecandidate", candidate, socket.id);
  });

  socket.on("message", (msg, username, roomid) => {
    io.to(roomid).emit("message", msg, username, moment().format("h:mm a"));
  });

  socket.on("react", (react, username, roomid) => {
    io.to(roomid).emit("react", react, username, moment().format("h:mm a"));
  });
  socket.on("file", (file, username, roomid) => {
    // file işlemleri yapılacak
    io.to(roomid).emit("file", file, username, moment().format("h:mm a"));
  });

  socket.on("getCanvas", () => {
    if (roomBoard[socketroom[socket.id]])
      socket.emit("getCanvas", roomBoard[socketroom[socket.id]]);
  });

  socket.on("draw", (newx, newy, prevx, prevy, color, size) => {
    socket
      .to(socketroom[socket.id])
      .emit("draw", newx, newy, prevx, prevy, color, size);
  });

  socket.on("clearBoard", () => {
    socket.to(socketroom[socket.id]).emit("clearBoard");
  });

  socket.on("store canvas", (url) => {
    roomBoard[socketroom[socket.id]] = url;
  });

  socket.on("drawing", (data) => socket.broadcast.emit("drawing", data));

  socket.on("disconnect", () => {
    if (!socketroom[socket.id]) return;
    socket
      .to(socketroom[socket.id])
      .emit(
        "message",
        `${socketname[socket.id]} left the chat.`,
        `Bot`,
        moment().format("h:mm a")
      );
    socket.to(socketroom[socket.id]).emit("remove peer", socket.id);
    var index = rooms[socketroom[socket.id]].indexOf(socket.id);
    rooms[socketroom[socket.id]].splice(index, 1);
    io.to(socketroom[socket.id]).emit(
      "user count",
      rooms[socketroom[socket.id]].length
    );
    delete socketroom[socket.id];
    console.log("--------------------");
    console.log(rooms[socketroom[socket.id]]);

    //toDo: push socket.id out of rooms
  });
});
