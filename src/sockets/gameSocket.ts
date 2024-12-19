import {Server} from "socket.io";
import {UserData, DeckData, ActionData} from "./types";
import gameService from "../services/gameService";
import UserDao from "../dao/userDao";
import userDao from "../dao/userDao";
import AService from "../services/AService";

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

class GameSocketManager extends AService {
    constructor() {
        super();}

    public setSocket(io: Server, socket: any): void {
        socket.on(GAME_ACTIONS.WAITING_PLAYER, (data:UserData): void => {
            console.log("WAITING PLAYER");
            const userId: number = data.id;
            const enemyId: number = gameService.processWaitingPlayer(userId)
            console.log(`User ${userId} is waiting for a fight...`)
            // If an enemy is available, fight
            if (enemyId > 0){
                // Send game starting message to the enemy
                const enemySocketId : string = UserDao.getUser(enemyId).socketId
                console.log(`User ${userId} will fight user ${enemyId}`)
                io.to(enemySocketId).emit(GAME_ACTIONS.CARD_SELECTION, {
                    userId
                });
                // Send game starting message to the user
                io.to(socket.id).emit(GAME_ACTIONS.CARD_SELECTION, {
                    enemyId
                });
            }
        })

        // Selection cards
        socket.on(GAME_ACTIONS.WAITING_CARDS, (data: DeckData): void => {
            const {id, cards} = data;
            console.log(`User ${id} is waiting for its opponent to pick up their cards...`);
            const enemyId: number = gameService.processWaitingCards(id, cards);
            // If other player also selected its cards, start the battle
            if (enemyId > 0) {
                console.log(`User ${id} and user ${enemyId} will begin fighting.`)
                const enemySocketId: string = UserDao.getUser(enemyId).socketId;
                // Get cards Ids
                const enemyCardsIds: number[] = gameService.getUserCardIds(enemyId);
                const userCardsIds: number[] = [];
                for (let card of cards) {
                    userCardsIds.push(card.id);
                }
                // Notify the users which cards their enemy selected
                io.to(enemySocketId).emit(GAME_ACTIONS.GAME_STARTS, {
                    cardsIds: userCardsIds
                })
                socket.emit(GAME_ACTIONS.GAME_STARTS, {
                    cardsIds: enemyCardsIds
                })
                // randomly chooses who starts
                const random: number = Math.random()
                const startingId: string = random > 0.5 ? enemySocketId : socket.id;
                console.log(`User ${random > 0.5 ? enemyId : id} is starting the fight.`)
                io.to(startingId).emit(GAME_ACTIONS.START_TURN)
            }
        })

        // Handle actions battling actions
        socket.on(GAME_ACTIONS.SEND_ACTION, (data:ActionData): void => {
            const { userId, cardId, targetId } = data;
            console.log(`Received action from user ${userId} : attacking card ${targetId} with card ${cardId}`)
            // Process attack
            const damage: number = gameService.processAction(userId, cardId, targetId);
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
            const enemyId: number = gameService.getOtherPlayer(userId)
            if (enemyId === -1) {
                return
            }
            const enemySocketId: string = UserDao.getUser(enemyId).socketId;
            if (!enemySocketId) {
                console.error(`Socket not found for enemy ${enemyId}`);
                return;
            }
            io.to(enemySocketId).emit(GAME_ACTIONS.RECEIVE_ACTION, {
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
            const status: number = gameService.isGameOver(userId)
            if (status > 0) {
                // Notify both players of the game result
                const winnerSocketId: string = UserDao.getUser(status).socketId;
                const loserSocketId: string = UserDao.getUser(status === userId ? enemyId : userId).socketId;

                if (winnerSocketId) {
                    io.to(winnerSocketId).emit(GAME_ACTIONS.GAME_OVER, { result: "win", award: 100 });
                }
                if (loserSocketId) {
                    io.to(loserSocketId).emit(GAME_ACTIONS.GAME_OVER, { result: "lose", award: 0 });
                }
                console.log(`Game over: User ${status} wins`);
            }
        })

        socket.on(GAME_ACTIONS.END_TURN, (data: UserData): void => {
            const userId: number = data.id;
            if(!gameService.isUserFighting(userId)) {return;}
            const enemyId: number = gameService.getOtherPlayer(userId);
            const enemySocketId: string = UserDao.getUser(enemyId).socketId;
            io.to(enemySocketId).emit(GAME_ACTIONS.START_TURN)
        })
}

    public handleDisconnect(userId: number, io:Server) {
        if (gameService.isUserFighting(userId)) {
            console.log(`User ${userId} was in a fight... Forfeiting...`);
            const enemySocketId: string = userDao.getUser(gameService.getOtherPlayer(userId)).socketId;
            gameService.userDisconnects(userId);
            io.to(enemySocketId).emit(GAME_ACTIONS.GAME_OVER, { result: "forfeited", award: 0 });
        }
    }
}

export default new GameSocketManager()