import {Column, Entity, PrimaryGeneratedColumn} from "typeorm";

@Entity()
export class UserProfile {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    email!: string;

    @Column()
    name!: string;

    @Column({default: "USER"})
    role!: string;
}
