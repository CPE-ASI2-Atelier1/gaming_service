import {Server} from "socket.io";
import {MessageData} from "./types";
import chatService from "../services/chatService";
import userDao from "../dao/userDao";
import { sendMessage } from "../routers/stompClient.js";
import AService from "../services/AService";
import User from "../model/User";

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

class ChatSocketManager extends AService {
    constructor() {
        super();
    }

    public setSocket(io: Server, socket: any): void {
        socket.on(ACTIONS.SEND_MESSAGE, (data: MessageData): void => {
            const { senderId, receiverId, message } = data;
            console.log(`User ${senderId} is sending a message to ${receiverId}.`);
            try {
                if (receiverId === 0) {
                    const result: boolean = chatService.handleMessage(senderId, receiverId, message);
                    console.log(`Broadcast message from User ${senderId}: ${message}`);
                    socket.broadcast.emit(ACTIONS.RECEIVE_MESSAGE, {
                        senderId,
                        message,
                        timestamp: new Date(),
                    });
                    sendMessage("/queue/chat.messages", {
                        senderId,
                        receiverId: 0,
                        message,
                        timestamp: new Date(),
                    });
                } else {
                    const result: boolean = chatService.handleMessage(senderId, receiverId, message);
        
                    if (result) {
                        const receiverSocketId = userDao.getUser(receiverId)?.socketId;
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
                        sendMessage("/queue/chat.messages", {
                            senderId,
                            receiverId,
                            message,
                            timestamp: new Date(),
                        });
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
            if (!this.isValidNumber(senderId) || !this.isValidNumber(receiverId)) {
                return; // Error
            }
            console.log(`User ${senderId} will now talk to ${receiverId}`);
            if (senderId === receiverId) {
                socket.emit(ACTIONS.USER_NOT_CONNECTED, {
                    receiverId,
                    message: "You cannot select yourself as the receiver.",
                });
                console.warn(`User ${senderId} attempted to select themselves.`);
                return;
            }
            const receiver: User = userDao.getUser(parseInt(receiverId, 10));
            if (!receiver) {
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
                    receiverName: receiver.name,
                });
        
                console.log(
                    `Chat history sent to User ${senderId} for conversation with User ${receiverId} (${receiver.name})`
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