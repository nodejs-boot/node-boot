import {Column, Entity, ObjectIdColumn} from "typeorm";

@Entity("users")
export class User {
    @ObjectIdColumn()
    _id?: string;

    @Column()
    email: string;

    @Column()
    password: string;

    @Column({nullable: true})
    name?: string; // New field
}
