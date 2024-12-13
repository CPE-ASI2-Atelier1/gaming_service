import Chat from "../model/Chat";

export default class ChatService {

    // Instance unique de ChatService
    private static instance: ChatService;

    // Contient la liste des discussions en cours
    private chats: Map<string, Chat> = new Map();

    public static getInstance(): ChatService {
        if (!ChatService.instance) {
            ChatService.instance = new ChatService();
        }
        return ChatService.instance;
    }

    // Assure la création d'une clé unique (user1Id_user2Id) pour chaque discussion
    private getChatKey(user1: number, user2: number): string {
        return [user1, user2].sort().join("_");
    }

    public handleMessage(senderId: number, receiverId: number, message: any): boolean {
        const key = this.getChatKey(senderId, receiverId);
        let chat = this.chats.get(key);
        if (!chat) {
            chat = new Chat(senderId, receiverId);
            if (!chat) {
                console.error("Failed to create Chat instance");
                return false;
            }
            this.chats.set(key, chat);
        }
        chat.addMessage( senderId, message );
        return true;
    }
}