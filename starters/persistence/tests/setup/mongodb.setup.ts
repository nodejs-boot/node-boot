import {ObjectId} from "mongodb";
import {Column, Entity, ObjectIdColumn} from "typeorm";

@Entity("users")
export class MongoUser {
    @ObjectIdColumn()
    _id?: ObjectId;

    @Column()
    name: string;

    @Column()
    money: number;

    constructor(name: string, money: number) {
        this.name = name;
        this.money = money;
    }
}
