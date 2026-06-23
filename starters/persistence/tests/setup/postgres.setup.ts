import {Column, DataSource, Entity, PrimaryColumn, PrimaryGeneratedColumn, Repository} from "typeorm";

@Entity("counters")
export class Counter {
    @PrimaryGeneratedColumn()
    value: number;
}

@Entity("users")
export class User {
    @PrimaryColumn()
    name: string;

    @Column({type: "integer"})
    money: number;

    constructor(name: string, money: number) {
        this.name = name;
        this.money = money;
    }
}

export class UserRepository extends Repository<User> {
    constructor(dataSource: DataSource) {
        super(User, dataSource.manager);
    }

    async createUser(name: string, money: number = 0): Promise<User> {
        const user = new User(name, money);

        return this.save(user);
    }

    async findUserByName(name: string): Promise<User | null> {
        return this.findOne({where: {name}});
    }
}
