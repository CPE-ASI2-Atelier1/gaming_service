import { reverse } from "node:dns";
import Chat from "../model/Chat";

class ChatService {

    // Contient la liste des discussions en cours
    private chats: Map<string, Chat> = new Map();

    // Assure la création d'une clé unique (user1Id_user2Id) pour chaque discussion
    private getChatKey(user1: number, user2: number): string {
        return [user1, user2].sort().join("_");
    }

    public removeChatsByUser(userId: number): void {
        const keysToDelete = [...this.chats.keys()].filter(key => key.includes(userId.toString()));
        keysToDelete.forEach(key => this.chats.delete(key));
        console.log(`Removed ${keysToDelete.length} chats associated with User ${userId}`);
    }

    public getChat(senderId: number, receiverId: number) {
        let key: string;
        if (senderId == null || receiverId == null) {
            throw new Error("Sender ID or Receiver ID cannot be null or undefined.");
        } else if (receiverId == 0) {
            key = "broadcast";
        } else {
            key = this.getChatKey(senderId, receiverId);
        }
        let chat: Chat = this.chats.get(key);
        if (!chat) {
            try {
                chat = new Chat(senderId, receiverId);
                this.chats.set(key, chat);
            } catch (error) {
                console.error(`Failed to create Chat instance for ${key}:`, error);
                throw new Error("Unable to create a new Chat instance.");
            }
        }
        return chat;
    }

    public handleMessage(senderId: number, receiverId: number, message: any): boolean {
        let chat: Chat = this.getChat(senderId, receiverId);
        chat.addMessage( senderId, message );
        return true;
    }

    public getChat2Json(senderId: number, receiverId: number) {
        let chat: Chat = this.getChat(senderId, receiverId);
        const chatJson = chat.toJson();
        return chatJson
    }
}

export default new ChatService()