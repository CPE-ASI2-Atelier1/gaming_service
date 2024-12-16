/**
 * @author Arthur Jezequel
 * @author Evann Nalewajek
 */

import {Server} from "socket.io"
import GameService from "../services/gameService";
import ChatService from "../services/chatService";

enum ACTIONS {
    SEND_MESSAGE = "SEND_MESSAGE",
    RECEIVE_MESSAGE = "RECEIVE_MESSAGE",
    USER_NOT_CONNECTED = "USER_NOT_CONNECTED"
}

enum GAME_ACTIONS {
    RECEIVE_ACTION = "SEND_ACTION",     // Sent to a user after an action was performed against him
    SEND_ACTION = "SEND_ACTION",        // Received when a user performed an attack
    WAITING_PLAYER = "WAITING_PLAYER",  // Received when a user is waiting for matchmaking
    WAITING_CARDS = "WAITING_CARDS",    // Received when a user is waiting for the other to select cards
    END_TURN = "END_TURN",              // Received when a user finished is turn
    START_TURN = "START_TURN",          // Emitted when it is a user turn to play
    GAME_STARTS = "GAME_STARTS",        // Emitted when matchmaking is completed
    CARD_SELECTION = "CARD_SELECTION",  // Emitted to warn user that they must pick their cards
}

export interface MessageData {
    senderId: number;
    receiverId: number;
    message: any;
}

interface UserData {
    id: number;
}

export type CardData = {
    id: number;
    attack: number;
    defence: number;
    energy: number;
    hp: number;
}

type DeckData = {
    id: number;
    cards: CardData[];
}

type ActionData = {
    userId: number;
    cardId: number;
    targetId: number;
}

export class Socket {
    private io;

    private socketMap : Map<number, number>;
    private gameService : GameService;

    constructor(server:any) {

        this.io = new Server(server);
        this.socketMap = new Map();
        this.gameService = GameService.getInstance();

        this.io.on("connection", (socket:any): void => {
            // Connexion de l'utilisateur
            const userId: number = Number(socket.handshake.query.userId);
            if (userId) {
                // Check is socket doesn't already exists (would be weird)
                this.socketMap.set(userId, socket.id);
                console.log(`User ${userId} connected with socket ID: ${socket.id}`);
            }

            // Deconnexion de l'utilisateur
            socket.on("disconnect", () => {
                this.socketMap.delete(userId);
                console.log(`User ${userId} disconnected.`);
            })

            // Asking for a game
            socket.on(GAME_ACTIONS.WAITING_PLAYER, (data:UserData): void => {
                console.log("WAITING PLAYER");
                const userId: number = data.id;
                const enemyId: number = this.gameService.processWaitingPlayer(userId)
                console.log(`User ${userId} is waiting for a fight...`)
                // If an enemy is available, fight
                if (enemyId > 0){
                    // Send game starting message to the enemy
                    const enemySocketId : number = this.socketMap.get(enemyId)
                    console.log(`User ${userId} will fight user ${enemyId}`)
                    this.io.to(enemySocketId).emit(GAME_ACTIONS.CARD_SELECTION, {
                        userId
                    });
                    // Send game starting message to the user
                    this.io.to(socket.id).emit(GAME_ACTIONS.CARD_SELECTION, {
                        enemyId
                    });
                }
            })

            // Selection cards
            socket.on(GAME_ACTIONS.WAITING_CARDS, (data: DeckData): void => {
                const {id, cards} = data;
                console.log(`User ${id} is waiting for its opponent to pick up their cards...`);
                const enemyId: number = this.gameService.processWaitingCards(id, cards);
                // If other player also selected its cards, start the battle
                if (enemyId > 0) {
                    console.log(`User ${id} and user ${enemyId} will begin fighting.`)
                    const enemySocketId: number = this.socketMap.get(enemyId);
                    // Get cards Ids
                    const enemyCardsIds: number[] = this.gameService.getUserCardIds(enemyId);
                    const userCardsIds: number[] = [];
                    for (let card of cards) {
                        userCardsIds.push(card.id);
                    }
                    // Notify the users which cards their enemy selected
                    this.io.to(enemySocketId).emit(GAME_ACTIONS.GAME_STARTS, {
                        cardsIds: userCardsIds
                    })
                    this.io.to(socket.id).emit(GAME_ACTIONS.GAME_STARTS, {
                        cardsIds: enemyCardsIds
                    })
                    // randomly chooses who starts
                    const random: number = Math.random()
                    const startingId: number = random > 0.5 ? enemySocketId : socket.id;
                    console.log(`User ${random > 0.5 ? id : enemyId} is starting the fight.`)
                    this.io.to(startingId).emit(GAME_ACTIONS.START_TURN)
                }
            })

            // Handle actions battling actions
            socket.on(GAME_ACTIONS.SEND_ACTION, (data:ActionData): void => {
                const { userId, cardId, targetId } = data;
                console.log(`Received action from user ${userId} : attacking card ${targetId} with card ${cardId}`)
                // Process attack
                const damage: number = this.gameService.processAction(userId, cardId, targetId);
                if (damage === -1) {
                    // ERROR HANDLING
                    return
                }
                const enemyId: number = this.gameService.getOtherPlayer(userId)
                if (enemyId === -1) {
                    return
                }
                const enemySocket: number = this.socketMap.get(enemyId)
                // Send what happened to the other user
                this.io.to(enemySocket).emit(GAME_ACTIONS.RECEIVE_ACTION, {
                    cardId: targetId,
                    damage: damage
                })
            })

            socket.on(GAME_ACTIONS.END_TURN, (data: UserData): void => {
                const userId: number = data.id;
                if(!this.gameService.isUserFighting(userId)) {return;}
                const enemyId: number = this.gameService.getOtherPlayer(userId);
                const enemySocketId: number = this.socketMap.get(enemyId);
                this.io.to(enemySocketId).emit(GAME_ACTIONS.START_TURN)
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
        })
    }

}