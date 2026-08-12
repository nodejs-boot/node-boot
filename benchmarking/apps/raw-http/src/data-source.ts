import "reflect-metadata";
import {DataSource} from "typeorm";
import {Todo} from "./entities/Todo";

export const AppDataSource = new DataSource({
    type: "postgres",
    host: "localhost",
    port: 5433,
    username: "postgres",
    password: "postgres",
    database: "raw_http",
    synchronize: true,
    entities: [Todo],
});
