import express from "express";
import http from "node:http";
// import https from "node:https";
import { Server as WSServer } from "socket.io";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { config, httpsServerConfig } from "./config/config.js";

// const allowedURLs = [
//     "http://localhost:3000",
//     "https://localhost:3000",
//     "http://localhost:3001",
//     // "https://localhost:8000",
//     "https://web-rtc-app-client.vercel.app",
//     "https://webrtc-app-server.onrender.com/"
// ];

const app = express();
const server = new http.Server(app);
// const server = new https.Server(httpsServerConfig ,app);
const io = new WSServer(server, { cors: { origin: "*" } });

app.use(express.json());
app.use(cors({ origin: "*" }));

app.get("/", (req, res) => {
    res.json({ welcome: "app works" });
});

const users = {};
const socketToRoom = {};

io.on("connection", (socket) => {
    socket.on("create-room", () => {
        console.log("CLIENT::create-room");
        const roomId = randomUUID();
        io.to(socket.id).emit("room-id-created", roomId);
    });

    socket.on("join room", (roomID) => {
        console.log("CLIENT::join room", roomID);
        if (users[roomID]) {
            const length = users[roomID].length;
            if (length === 4) {
                socket.emit("room full");
                return;
            }
            users[roomID].push(socket.id);
        } else {
            users[roomID] = [socket.id];
        }
        socketToRoom[socket.id] = roomID;
        const usersInThisRoom = users[roomID].filter((id) => id !== socket.id);

        socket.emit("hello", socket.id);

        socket.emit("all users", usersInThisRoom);
    });

    socket.on("send-text-message", (message) => {
        (users[message.roomId] || []).forEach((user) => {
            if (user !== socket.id) {
                io.to(user).emit("receive-text-message", message);
            }
        });
    });

    socket.on("set-video-on", (roomID, userId) => {
        (users[roomID] || []).forEach((user) => {
            if (user !== socket.id) {
                io.to(user).emit("video-on", userId);
            }
        });
    });

    socket.on("set-video-off", (roomID, userId) => {
        (users[roomID] || []).forEach((user) => {
            if (user !== socket.id) {
                io.to(user).emit("video-off", userId);
            }
        });
    });

    socket.on("set-audio-on", (roomID, userId) => {
        (users[roomID] || []).forEach((user) => {
            if (user !== socket.id) {
                io.to(user).emit("audio-on", userId);
            }
        });
    });

    socket.on("set-audio-off", (roomID, userId) => {
        (users[roomID] || []).forEach((user) => {
            if (user !== socket.id) {
                io.to(user).emit("audio-off", userId);
            }
        });
    });

    socket.on("sending signal", (payload) => {
        const { signal, callerID, userToSignal } = payload;
        console.log("CLIENT::sending signal", { signalType: signal.type, callerID, to: userToSignal });
        io.to(userToSignal).emit("user joined", { signal, callerID });
    });

    socket.on("returning signal", (payload) => {
        const { signal, callerID } = payload;
        console.log("CLIENT::returning signal", { signalType: signal.type, callerID, to: socket.id });
        io.to(callerID).emit("receiving returned signal", { signal, id: socket.id });
    });

    socket.on("disconnecting", () => {
        console.log("disconnecting", { users, socketToRoom });

        const roomID = socketToRoom[socket.id];
        let room = users[roomID];

        if (room) {
            delete socketToRoom[socket.id];
            users[roomID] = room.filter((id) => id !== socket.id);
            users[roomID].forEach((user) => {
                io.to(user).emit("user left", { user: socket.id, remainingUsers: users[roomID] });
            });
        }
    });
});

server.listen(config.PORT, () => {
    console.log(`listening on port ${config.PORT}`);
});
