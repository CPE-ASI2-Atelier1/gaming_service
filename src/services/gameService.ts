/**
 * @author Arthur Jezequel
 */

import Game from "../model/Game";
import {CardData} from "../sockets/gamingSocket";

// INterface Collection...

class GameCollection {
    private content: Game[] = [];

    constructor() { }

    public get(id: number): Game {
        for (let game of this.content) {
            if (game.isUser(id)) {
                return game;
            }
        }
        return null;
    }

    /**
     * Remove a game from the collection
     * @param id Userid
     * @return True if operation succeeded, false otherwise
     */
    public removeByUser(id: number): boolean {
        const index = this.content.indexOf(this.get(id));
        if (index >= 0) {
            this.content.splice(index, 1);
            return true;
        }
        return false;
    }

    public add(game: Game): void {
        this.content.push(game);
    }
}

export default class GameService {

    private static instance: GameService;

    private waitingPlayers : number[] = [];
    private games: GameCollection = new GameCollection();

    public static getInstance() {
        if (!GameService.instance) {
            GameService.instance = new GameService();
        }
        return GameService.instance;
    }

    public processWaitingPlayer(userId: number) {
        // Look if another player is waiting
        if (this.waitingPlayers !== undefined && this.waitingPlayers.length > 0) {
            // Other player was found : a game is created
            const enemyId = this.waitingPlayers.pop(); // We take the first user found
            const game: Game = new Game(userId, enemyId);
            this.games.add(game);
            return enemyId;
        }
        // Else, add it to the waiting player list
        else {
            this.waitingPlayers.push(userId)
            return 0
        }
    }

    /**
     * Handle the request from a user giving its cards
     * @param userId User ID
     * @param cards User's cards
     * @return Id of the enemy user if the game is ready, else returns 0
     */
    public processWaitingCards(userId: number, cards:CardData[]): number{
        // Set user cards
        const game = this.games.get(userId);
        game.setCards(userId, cards);
        // See if game is ready
        if (game.isGameReady()){
            return game.getOtherUser(userId);
        }
        return 0;
    }

    // Composant useState / store qui garde un oeuil sur la quantité d'enregie disponible

    // Sur le front, il y a la gestion de l'energie : on a 100 pts a chaque tour, attaquer avec une carte diminue
    // ces points par card.energy. Si l'attaque peut être lancée, la requete est envoyée au back.
    public processAction(userId: number, cardId: number, targetId: number): number {
        return this.games.get(userId).processAction(userId, cardId, targetId);
        // Error handling ?
    }

    public getUserCardIds(userId: number): number[] {
        const game: Game = this.games.get(userId);
        return game.getUserCardsIds(userId);
    }

    // Used to delete game is user disconnects
    public isUserFighting(userId: number): boolean {
        const game: Game = this.games.get(userId);
        return game != null;
    }

    public getOtherPlayer(userId: number): number {
        const game: Game = this.games.get(userId);
        if (!game) {
            return -1;
        }
        return game.getOtherUser(userId);
    }

    public userDisconnects(userId: number): number {
        const game: Game = this.games.get(userId);
        if (game == null) {
            return -1;
        }
        const otherUserId = game.getOtherUser(userId);
        this.games.removeByUser(userId);
        return otherUserId;
    }
}