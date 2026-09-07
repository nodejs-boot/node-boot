import {Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn} from "typeorm";

export type TodoPriority = "low" | "medium" | "high";

@Entity()
export class Todo {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @Column({type: "text", nullable: true})
    description?: string;

    @Column({default: false})
    completed: boolean;

    @Column({type: "text", default: "medium"})
    priority: TodoPriority;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
