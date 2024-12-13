interface Message {
    sender: number;
    message: string;
    timestamp: Date;
  };
  
  class Chat {
    private participants: [number, number];
    private messages: Message[] = [];
  
    constructor(user1: number, user2: number) {
      this.participants = [user1, user2];
    }
  
    public addMessage(sender: number, message: string ): void {
        this.messages.push({
            sender: sender,
            message: message,
            timestamp: new Date()
        });
    }
  
    public getMessages(): Message[] {
      return this.messages;
    }

    public getParticipants(): [number, number] {
        return this.participants;
      }
  }
  
  export default Chat;
  