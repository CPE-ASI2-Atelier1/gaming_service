/**
 * @author Arthur Jezequel
 * @author Evann Nalewajek
 */

import {Server} from "socket.io"
import GameService from "../services/gameService";
import ChatService from "../services/chatService";
import gameService from "../services/gameService";

enum ACTIONS {
    SEND_MESSAGE = "SEND_MESSAGE",
    RECEIVE_MESSAGE = "RECEIVE_MESSAGE",
    RECEIVE_ACTION = "RECEIVE_ACTION",
    SEND_ACTION = "SEND_ACTION",
    ON_USER_SELECT = "ON_USER_SELECT",
    ON_USER_SELECTED = "ON_USER_SELECTED",
    USER_NOT_CONNECTED = "USER_NOT_CONNECTED",
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
    ACTION_SUCCESS = "ACTION_SUCCESS",  // Emitted if an action was successfully handled
    ACTION_FAILED = "ACTION_FAILED",    // Emitted if an action failed to be handled
    GAME_OVER = "GAME_OVER",            // Emitted when the game is over
}

export interface MessageData {
    senderId: number;
    receiverId: number;
    message: any;
}

interface UserData {
    id: number;
    // name: string
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

    // Services partagés
    private chatService: ChatService;
    private gameService: any;

    constructor(server: any) {
        this.io = new Server(server);
        this.socketMap = new Map();

        // Initialisation des services
        this.chatService = ChatService.getInstance();
        this.gameService = gameService;

        this.io.on("connection", (socket: any): void => {
            // Connexion de l'utilisateur
            const userId: number = Number(socket.handshake.query.userId);
            if (userId) {
                // TODO : Check is socket doesn't already exists (would be weird)
                this.socketMap.set(userId, socket.id);
                console.log(`User ${userId} connected with socket ID: ${socket.id}`);
            }

            // Deconnexion de l'utilisateur
            socket.on("disconnect", () => {
                this.socketMap.delete(userId);
                console.log(`User ${userId} disconnected.`);
                this.chatService.removeChatsByUser(userId);
                if (this.gameService.isUserFighting(userId)) {
                    console.log(`User ${userId} was in a fight... Forfeiting...`);
                    const enemySocketId: number = this.socketMap.get(this.gameService.getOtherPlayer(userId))
                    this.gameService.userDisconnects(userId)
                    this.io.to(enemySocketId).emit(GAME_ACTIONS.GAME_OVER, { result: "forfeited", award: 0 })
                }
            });

            // Selection d'un interlocuteur
            socket.on(ACTIONS.ON_USER_SELECT, (data): void => {
                const { senderId, receiverId } = data;
                if (senderId === receiverId) {
                    socket.emit(ACTIONS.USER_NOT_CONNECTED, {
                        receiverId,
                        message: "You cannot select yourself as the receiver.",
                    });
                    console.warn(`User ${senderId} attempted to select themselves.`);
                    return;
                }
                try {
                    const body: string = this.chatService.getChat2Json(senderId, receiverId);
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
                    socket.emit(GAME_ACTIONS.GAME_STARTS, {
                        cardsIds: enemyCardsIds
                    })
                    // randomly chooses who starts
                    const random: number = Math.random()
                    const startingId: number = random > 0.5 ? enemySocketId : socket.id;
                    console.log(`User ${random > 0.5 ? enemyId : id} is starting the fight.`)
                    this.io.to(startingId).emit(GAME_ACTIONS.START_TURN)
                }
            })

            // Handle actions battling actions
            socket.on(GAME_ACTIONS.SEND_ACTION, (data:ActionData): void => {
                const { userId, cardId, targetId } = data;
                console.log(`Received action from user ${userId} : attacking card ${targetId} with card ${cardId}`)
                // Process attack
                const damage: number = this.gameService.processAction(userId, cardId, targetId);
                if (damage < 0) {
                    let errorMessage: string;
                    switch (damage) {
                        case -1:
                            errorMessage = "User deck could not be found.";
                            break;
                        case -2:
                            errorMessage = "Enemy deck could not be found.";
                            break;
                        case -3:
                            errorMessage = "The card could not be found.";
                            break;
                        case -4:
                            errorMessage = "The target card could not be found.";
                            break;
                        default:
                            errorMessage = "An unknown error occurred.";
                    }
                    console.error(`Error in action processing: ${errorMessage}`);
                    socket.emit(GAME_ACTIONS.ACTION_FAILED, {
                        message: errorMessage,
                        code: damage
                    });
                    return;
                }
                // Send what happened to the other user
                const enemyId: number = this.gameService.getOtherPlayer(userId)
                if (enemyId === -1) {
                    return
                }
                const enemySocketId: number = this.socketMap.get(enemyId)
                if (!enemySocketId) {
                    console.error(`Socket not found for enemy ${enemyId}`);
                    return;
                }
                this.io.to(enemySocketId).emit(GAME_ACTIONS.RECEIVE_ACTION, {
                    cardId: targetId,
                    targetId: cardId,
                    damage: damage
                })
                socket.emit(GAME_ACTIONS.ACTION_SUCCESS, {
                    cardId: targetId,
                    targetId: cardId,
                    damage: damage
                })
                // Check if the battle is over
                const status: number = this.gameService.isGameOver(userId)
                if (status > 0) {
                    // Notify both players of the game result
                    const winnerSocketId: number = this.socketMap.get(status);
                    const loserSocketId: number = this.socketMap.get(status === userId ? enemyId : userId);

                    if (winnerSocketId) {
                        this.io.to(winnerSocketId).emit(GAME_ACTIONS.GAME_OVER, { result: "win", award: 100 });
                    }
                    if (loserSocketId) {
                        this.io.to(loserSocketId).emit(GAME_ACTIONS.GAME_OVER, { result: "lose", award: 0 });
                    }
                    console.log(`Game over: User ${status} wins`);
                }
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
                    const result = this.chatService.handleMessage(senderId, receiverId, message);

                    // Après traitement du message, on envoie le message à l'utilisateur cible
                    if (result) {
                        const receiverSocketId = this.socketMap.get(receiverId);
                        if (receiverSocketId) {
                            this.io.to(receiverSocketId).emit(ACTIONS.RECEIVE_MESSAGE, {
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
        })
    }

}