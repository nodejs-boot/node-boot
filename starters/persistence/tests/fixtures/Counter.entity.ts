import {Column, Entity, PrimaryGeneratedColumn} from "typeorm";

@Entity()
export class Counter {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    label!: string;

    @Column()
    value!: number;
}
