import express from 'express';
// @ts-ignore
import CONFIG = require('../config.json');
import {createServer} from "node:http";
import path from "path";
import {Server} from "socket.io";
import userDao from "./dao/userDao";
import GameSocketManager from "./sockets/gameSocket";
import ChatSocketManager from "./sockets/chatSocket"

/**
 *
 */
class MyApp {
    private readonly PORT: number = CONFIG.port;
    private readonly ADDRESS: string = CONFIG.host;
    private readonly server:any;

    // ------- Routers -------
    private application:any;
    private io:Server;

    constructor() {
        this.application = express(); // Create application
        this.server = createServer(this.application); // Create HTTP Server

        //////////////// MIDDLEWARES /////////////////
        //this.application.use(express.static(CONFIG.www)); // Serve static content
        this.application.disable('x-powered-by');
        this.application.use(express.static(path.join(__dirname, "../static")));
        this.application.use(express.json()); // ability to parse JSON for POST requests
        this.application.use((req, res, next) => { // Debugging (prints requests)
            console.log(`Received ${req.method} request for ${req.url}`);
            next();
        });

        ////////////////// ROUTERS ///////////////////
        // Can be tested through PostMan

        ///////////////// SOCKETS ///////////////////
        //const socket = new Socket(this.server);
        this.io = new Server(this.server);
        this.io.on("connection", (socket: any): void => {
            // Connexion de l'utilisateur
            const userId: number = Number(socket.handshake.query.userId);
            const userName: string = String(socket.handshake.query.userName);
            if (userId && userName) {
                // TODO : Check is socket doesn't already exists (would be weird)
                userDao.addUser(userId, userName, socket.id);
                console.log(`User ${userId} (${userName}) connected with socket ID: ${socket.id}`);
            }
            GameSocketManager.setSocket(this.io, socket);
            ChatSocketManager.setSocket(this.io, socket);

            this.io.emit("UPDATE_CONNECTED_USERS", userDao.getAllUsers());

            socket.on("disconnect", () => {
                userDao.removeUser(userId)
                console.log(`User ${userId} disconnected.`);
                ChatSocketManager.handleDisconnect(userId, this.io)
                GameSocketManager.handleDisconnect(userId, this.io)
                this.io.emit("UPDATE_CONNECTED_USERS", userDao.getAllUsers());
            });
        });


        ////////////////// LISTEN ///////////////////
        // NB : When we use application.listen instead, express creates an internal http server... But it is not accessible
        // Yet, we need to have access to a http server to use socket.io !
        this.server.listen(this.PORT, this.ADDRESS, () => {
            console.log(`Server is running at http://${this.ADDRESS}:${this.PORT}`);
        });
    }
}

const app = new MyApp();