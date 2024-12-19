import User from "../model/User";
import {UserData} from "../sockets/types";

class UserSet {
    private users: User[] = [];

    // Check if unique

    public add(user: User): void {
        this.users.push(user);
    }

    public remove(user: User): void {
        const index: number = this.users.indexOf(user);
        if (index >= 0) {
            this.users.splice(index, 1);
        }
    }

    public get(userId: number): User {
        for (let user of this.users) {
            if (user.id === userId) {
                return user;
            }
        }
    }

    public getAll(): User[] {
        return this.users;
    }
}

class UserDao {

    private userCollection: UserSet;

    constructor({}) {
        console.log(`new UserDao`);
        this.userCollection = new UserSet();
        this.addUser(0, "Broadcast", "0")
    }

    public addUser(id: number, name: string, socketId: string) {
        const user = new User(id, socketId, name);
        this.userCollection.add(user);
    }

    public removeUser(id: number) {
        const user: User = this.userCollection.get(id);
        this.userCollection.remove(user);
    }

    public getUser(id: number) {
        return this.userCollection.get(id);
    }

    public getAllUsers(): UserData[] {
        const users: UserData[] = [];
        for (let user of this.userCollection.getAll()){
            users.push({id: user.id, name: user.name})
        }
        return users;
    }
}

export default new UserDao({});