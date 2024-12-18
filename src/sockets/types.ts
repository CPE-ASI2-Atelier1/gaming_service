export type MessageData = {
    senderId: number;
    receiverId: number;
    message: any;
}

export type UserData = {
    id: number;
    name: string;
}

export type CardData = {
    id: number;
    attack: number;
    defence: number;
    energy: number;
    hp: number;
}

export type DeckData = {
    id: number;
    cards: CardData[];
}

export type ActionData = {
    userId: number;
    cardId: number;
    targetId: number;
}