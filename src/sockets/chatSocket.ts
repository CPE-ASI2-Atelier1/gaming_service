import {Server} from "socket.io";
import {MessageData} from "./types";
import chatService from "../services/chatService";
import userDao from "../dao/userDao";

enum ACTIONS {
    SEND_MESSAGE = "SEND_MESSAGE",
    RECEIVE_MESSAGE = "RECEIVE_MESSAGE",
    RECEIVE_ACTION = "RECEIVE_ACTION",
    SEND_ACTION = "SEND_ACTION",
    ON_USER_SELECT = "ON_USER_SELECT",
    ON_USER_SELECTED = "ON_USER_SELECTED",
    USER_NOT_CONNECTED = "USER_NOT_CONNECTED",
}

// Implements SocketManager pour une belle abstraction...

class ChatSocketManager {
    constructor() {}

    public setSocket(io: Server, socket: any): void {
        // Envoie d'un message
        socket.on(ACTIONS.SEND_MESSAGE, (data: MessageData): void => {
            const { senderId, receiverId, message } = data;
            console.log(`User ${senderId} is sending a message to ${receiverId}.`);
            try {
                const result: boolean = chatService.handleMessage(senderId, receiverId, message);

                // Après traitement du message, on envoie le message à l'utilisateur cible
                if (result) {
                    const receiverSocketId = userDao.getUser(receiverId).socketId;
                    if (receiverSocketId) {
                        io.to(receiverSocketId).emit(ACTIONS.RECEIVE_MESSAGE, {
                            senderId,
                            message,
                            timestamp: new Date(),
                        });
                    } else {
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
        });

        socket.on(ACTIONS.RECEIVE_MESSAGE, (data) => {
            const { senderId, message, timestamp } = data;
            console.log("Utilisateur:", senderId);
            console.log("Message reçu:", message);
            console.log("Heure:", timestamp);
        });

        socket.on(ACTIONS.ON_USER_SELECT, (data): void => {
            const { senderId, receiverId } = data;
            console.log(`User ${senderId} will now talk to ${receiverId}`)
            if (senderId === receiverId) {
                socket.emit(ACTIONS.USER_NOT_CONNECTED, {
                    receiverId,
                    message: "You cannot select yourself as the receiver.",
                });
                console.warn(`User ${senderId} attempted to select themselves.`);
                return;
            }
            if (userDao.getUser(receiverId) == null) {
                socket.emit(ACTIONS.USER_NOT_CONNECTED, {
                    receiverId,
                    message: "The user you are trying to contact is not connected.",
                });
                console.warn(`User ${senderId} tried to chat with user ${receiverId} who is not connected.`);
                return;
            }
            try {
                const body: string = chatService.getChat2Json(senderId, receiverId);
                socket.emit(ACTIONS.ON_USER_SELECTED, {
                    participants: JSON.parse(body).participants,
                    messages: JSON.parse(body).messages,
                });

                console.log(
                    `Chat history sent to User ${senderId} for conversation with User ${receiverId}`
                );
            } catch (error) {
                console.error("Error fetching chat history:", error);
            }
        });
    }

    public handleDisconnect(userId: number, io: Server): void {
        chatService.removeChatsByUser(userId);
    }
}

export default new ChatSocketManager();