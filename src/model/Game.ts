/**
 * @author Arthur Jezequel
 */

import {CardData} from "../sockets/gamingSocket";

class FightingCard {
    id: number;
    attack: number;
    defence: number;
    energy: number; // Required number of energy to attack
    hp: number; // Max hp
    currentEnergy: number;
    currentHp: number;

    constructor(id: number, attack: number, defence: number, energy: number, hp: number) {
        this.id = id;
        this.attack = attack;
        this.defence = defence;
        this.energy = energy;
        this.hp = hp;
        this.currentEnergy = energy;
        this.currentHp = hp;
    }

    // Static factory
    public static createFromData(card: CardData) {
        return new FightingCard(card.id, card.attack, card.defence, card.energy, card.hp);
    }
}
// JAVASCRIPT DOES NOT HANDLE CONSTRUCTOR OR METHOD OVERLOADING...
// Puis les interfaces ne sont pas de vraies interfaces...
// Puis au final typescript n'est qu'une couche superficielle au dessus du javascript...
// PAs besoin de se prendre la tête à faire de belles abstractions

class UserDeck {
    userId: number;
    cards: FightingCard[];

    constructor(userId: number, cards: FightingCard[]) {
        this.userId = userId;
        this.cards = cards;
    }

    // public static createFromData(userId: number, cards: CardData[]) {
    //     const deck: FightingCard[] = [];
    //     for (let card of cards) {
    //         deck.push(FightingCard.createFromData(card));
    //     }
    //     return new UserDeck(userId, deck);
    // }

    public setCards(cards: CardData[]){
        this.cards = [];
        for (let card of cards) {
            this.cards.push(FightingCard.createFromData(card));
        }
    }

    /**
     * Get card by Ids
     * @param cardIs
     */
    public getCard(cardIs: number): FightingCard{
        for (let card of this.cards) {
            if (card.id === cardIs){
                return card;
            }
        }
        return null;
    }
}

export default class Game {

    private user1: UserDeck;
    private user2: UserDeck;

    // constructor(user1Id: number, user1Cards: CardData[], user2Id: number, user2Cards: CardData[]) {
    //     this.user1 = UserDeck.createFromData(user1Id, user1Cards);
    //     this.user2 = UserDeck.createFromData(user2Id, user2Cards);
    // }

    constructor(user1Id: number, user2Id: number) {
        this.user1 = new UserDeck(user1Id, [])
        this.user2 = new UserDeck(user2Id, [])
    }

    public isUser(userId: number): boolean {
        return this.user1.userId === userId || this.user2.userId === userId;
    }

    public isGameReady(): boolean {
        return this.user1.cards.length > 0 && this.user2.cards.length > 0;
    }

    public getOtherUser(userId:number): number {
        if (this.user1.userId === userId) {
            return this.user2.userId;
        }
        return this.user1.userId;
    }

    public getUserCardsIds(userId: number): number[] {
        let cards: FightingCard[];
        const ids: number[] = [];
        if (this.user1.userId === userId) {
            cards = this.user1.cards;
        } else {cards = this.user2.cards;}
        for (let card of cards) {
            ids.push(card.id);
        }
        return ids;
    }

    public setCards(userId: number, cards: CardData[]): void {
        this.getUserDeck(userId).setCards(cards);
    }

    private getUserDeck(userId: number): UserDeck {
        if (this.user1.userId === userId) {
            return this.user1;
        }
        else if (this.user2.userId === userId) {
            return this.user2;
        }
        else {return null}
    }

    /**
     * Process a fighting action
     * @param userId
     * @param cardId
     * @param targetId
     * @return Returns damage dealt, or -1 if the action could not be handled.
     */
    public processAction(userId: number, cardId: number, targetId: number): number {
        const deck: UserDeck = this.getUserDeck(userId);
        const targetDeck : UserDeck = this.getUserDeck(this.getOtherUser(userId));
        if (!deck || !targetDeck) {return -1;}
        const card: FightingCard = deck.getCard(cardId)
        const targetCard: FightingCard = targetDeck.getCard(targetId);
        if (!card || !targetCard) {return -1;}
        const critical: 1 | 1.5 = Math.random() < 0.5 ? 1 : 1.5;
        const damage: number = Math.max(( card.attack * critical ) - targetCard.defence, 0);
        if (targetCard.currentHp - damage <= 0){
            // Logic about a card dying ?
            targetCard.currentHp = 0;
            return damage;
        }
        targetCard.currentHp -= damage;
        return damage;
    }
}