import {Column, Entity, PrimaryGeneratedColumn, Repository} from "typeorm";
import {DataRepository} from "@node-boot/starter-persistence";

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    firstName: string;

    @Column()
    lastName: string;
}

@DataRepository(User)
export class UserRepository extends Repository<User> {}
