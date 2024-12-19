class User {
    private _id: number;
    private _socketId: string;
    private _name: string;

    constructor(id: number, socketId: string, name: string) {
        this._id = id;
        this._socketId = socketId;
        this._name = name;
    }

    get id(): number {
        return this._id;
    }

    set id(value: number) {
        this._id = value;
    }

    get socketId(): string {
        return this._socketId;
    }

    set socketId(value: string) {
        this._socketId = value;
    }

    get name(): string {
        return this._name;
    }

    set name(value: string) {
        this._name = value;
    }
}

export default User;