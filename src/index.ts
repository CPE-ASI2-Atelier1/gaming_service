import express from 'express';
// @ts-ignore
import CONFIG = require('../config.json');
import {createServer} from "node:http";
import { Socket } from './sockets/gamingSocket';
import path from "path";
/**
 *
 */
class MyApp {
    private readonly PORT: number = CONFIG.port;
    private readonly ADDRESS: string = CONFIG.host;
    private readonly server:any;

    // ------- Routers -------
    private application:any;

    constructor() {
        this.application = express(); // Create application
        this.server = createServer(this.application); // Create HTTP Server

        //////////////// MIDDLEWARES /////////////////
        //this.application.use(express.static(CONFIG.www)); // Serve static content
        this.application.use(express.static(path.join(__dirname, "../static")));
        this.application.use(express.json()); // ability to parse JSON for POST requests
        this.application.use((req, res, next) => { // Debugging (prints requests)
            console.log(`Received ${req.method} request for ${req.url}`);
            next();
        });

        ////////////////// ROUTERS ///////////////////
        // Can be tested through PostMan

        ///////////////// SOCKETS ///////////////////
        const socket = new Socket(this.server);


        ////////////////// LISTEN ///////////////////
        // NB : When we use application.listen instead, express creates an internal http server... But it is not accessible
        // Yet, we need to have access to a http server to use socket.io !
        this.server.listen(this.PORT, this.ADDRESS, () => {
            console.log(`Server is running at http://${this.ADDRESS}:${this.PORT}`);
        });
    }
}

const app = new MyApp();