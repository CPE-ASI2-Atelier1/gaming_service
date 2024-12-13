import {Server} from "socket.io"
import FightingCards from "../types/FightingCard";
import GameService from "../services/gameService";
import ChatService from "../services/chatService";

enum ACTIONS {
    SEND_MESSAGE = "SEND_MESSAGE",
    RECEIVE_MESSAGE = "RECEIVE_MESSAGE",
    RECEIVE_ACTION = "RECEIVE_ACTION",
    SEND_ACTION = "SEND_ACTION",
    USER_NOT_CONNECTED = "USER_NOT_CONNECTED"
}

export interface MessageData {
    senderId: number;
    receiverId: number;
    message: any;
}

interface ActionData {
    userId: number;
    enemyId: number;
    deck: FightingCards[];
}

export class Socket {
    private io;

    private socketMap : Map<number, number>;

    constructor(server:any) {

        this.io = new Server(server);
        this.socketMap = new Map();

        this.io.on("connection", (socket:any): void => {
            // Connexion de l'utilisateur
            const userId = Number(socket.handshake.query.userId);
            if (userId) {
                this.socketMap.set(userId, socket.id);
                console.log(`User ${userId} connected with socket ID: ${socket.id}`);
            }
        

            // Deconnexion de l'utilisateur
            socket.on("disconnect", () => {
                this.socketMap.delete(userId);
                console.log(`User ${userId} disconnected.`);
            })

            // Envoie d'un message
            socket.on(ACTIONS.SEND_MESSAGE, (data: MessageData): void => {
                const { senderId, receiverId, message } = data;
                try {
                    const chatService = ChatService.getInstance();
                    const result = chatService.handleMessage(senderId, receiverId, message);

                    // Après traitement du message, on envoie le message à l'utilisateur cible
                    if (result) {
                        const receiverSocketId = this.socketMap.get(receiverId);
                        if (receiverSocketId) {
                            this.io.to(receiverSocketId).emit(ACTIONS.RECEIVE_MESSAGE, {
                                senderId,
                                message,
                                timestamp: new Date()
                            });
                        }  else {
                            // Le destinataire est déconnecté, notifier l'expéditeur
                            socket.emit(ACTIONS.USER_NOT_CONNECTED, {
                                receiverId,
                                message: "The user you are trying to reach is not online.",
                            });
                            console.warn(`User ${receiverId} is not connected.`);
                        }
                    }
                } catch (error) {
                    console.error("Error processing message: ", error);
                }
            })

            socket.on(ACTIONS.RECEIVE_MESSAGE, (data) => {
                const { senderId, message, timestamp } = data;
                console.log("Utilisateur:", senderId);
                console.log("Message reçu:", message);
                console.log("Heure:", timestamp);
            });

            socket.on(ACTIONS.SEND_ACTION, (data: ActionData) :void => {
                GameService.processAction(data.userId, data.enemyId, data.deck);
            })
        })
    }

}