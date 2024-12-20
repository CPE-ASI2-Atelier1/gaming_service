"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
// @ts-ignore
const CONFIG = require("../config.json");
const node_http_1 = require("node:http");
const path_1 = __importDefault(require("path"));
const socket_io_1 = require("socket.io");
const userDao_1 = __importDefault(require("./dao/userDao"));
const gameSocket_1 = __importDefault(require("./sockets/gameSocket"));
const chatSocket_1 = __importDefault(require("./sockets/chatSocket"));
/**
 *
 */
class MyApp {
    constructor() {
        this.PORT = CONFIG.port;
        this.ADDRESS = CONFIG.host;
        this.application = (0, express_1.default)(); // Create application
        this.server = (0, node_http_1.createServer)(this.application); // Create HTTP Server
        //////////////// MIDDLEWARES /////////////////
        //this.application.use(express.static(CONFIG.www)); // Serve static content
        this.application.disable('x-powered-by');
        this.application.use(express_1.default.static(path_1.default.join(__dirname, "../static")));
        this.application.use(express_1.default.json()); // ability to parse JSON for POST requests
        this.application.use((req, res, next) => {
            console.log(`Received ${req.method} request for ${req.url}`);
            next();
        });
        ////////////////// ROUTERS ///////////////////
        // Can be tested through PostMan
        ///////////////// SOCKETS ///////////////////
        //const socket = new Socket(this.server);
        this.io = new socket_io_1.Server(this.server);
        this.io.on("connection", (socket) => {
            // Connexion de l'utilisateur
            const userId = Number(socket.handshake.query.userId);
            const userName = String(socket.handshake.query.userName);
            if (userId && userName) {
                // TODO : Check is socket doesn't already exists (would be weird)
                userDao_1.default.addUser(userId, userName, socket.id);
                console.log(`User ${userId} (${userName}) connected with socket ID: ${socket.id}`);
            }
            gameSocket_1.default.setSocket(this.io, socket);
            chatSocket_1.default.setSocket(this.io, socket);
            this.io.emit("UPDATE_CONNECTED_USERS", userDao_1.default.getAllUsers());
            socket.on("disconnect", () => {
                userDao_1.default.removeUser(userId);
                console.log(`User ${userId} disconnected.`);
                chatSocket_1.default.handleDisconnect(userId, this.io);
                gameSocket_1.default.handleDisconnect(userId, this.io);
                this.io.emit("UPDATE_CONNECTED_USERS", userDao_1.default.getAllUsers());
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
//# sourceMappingURL=index.js.map