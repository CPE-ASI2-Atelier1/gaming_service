import {Server} from "socket.io"
import FightingCards from "../types/FightingCard";
import GameService from "../services/gameService";

enum ACTIONS {
    SEND_MESSAGE = "SEND_MESSAGE",
    RECEIVE_MESSAGE = "RECEIVE_MESSAGE",
    RECEIVE_ACTION = "RECEIVE_ACTION",
    SEND_ACTION = "SEND_ACTION",
}

interface MessageData {
    userid: number;
    // ...
}

interface ActionData {
    userId: number;
    enemyId: number;
    deck: FightingCards[];
}

export class Socket {
    private io;

    constructor(server:any) {
        this.io = new Server(server);
        this.io.on("connection", (socket:any): void => {
            socket.on(ACTIONS.RECEIVE_ACTION, (data: ActionData) :void => {
                GameService.processAction(data.userId, data.enemyId, data.deck);
            })
        })
    }
}