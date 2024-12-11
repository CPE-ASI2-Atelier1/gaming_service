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

    private sockerMap : Map<number, number>;

    constructor(server:any) {

        this.io = new Server(server);
        this.io.on("connection", (socket:any): void => {
            // userId = socket.handshake.query.userId;
            // sockerMap.set(userId, socket.id
            socket.on(ACTIONS.SEND_ACTION, (data: ActionData) :void => {
                GameService.processAction(data.userId, data.enemyId, data.deck);
            })
            //socket.on(ACTIONS.SEND_MESSAGE, (data: ActionData) :void => {
                // ChatService.doSmth()
                // if ok :
                //      socketReceiver = map.get(userId2)
                //      socker.emit(RECEIVE_MESSAGE, truc)
                // else:
                //      catastrophe
            //})
        })
    }
}