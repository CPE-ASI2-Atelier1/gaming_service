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

    public toJson(): string {
      return JSON.stringify(
        {
          participants: this.participants,
          messages: this.messages.map(msg => ({
            sender: msg.sender,
            message: msg.message,
            timestamp: msg.timestamp.toISOString() // Convertion au format standardisé ISO8601
          }))
        }
      )
    }
  }
  
  export default Chat;
  