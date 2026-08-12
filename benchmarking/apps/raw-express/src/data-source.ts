import "reflect-metadata";
import {DataSource} from "typeorm";
import {Todo} from "./entities/Todo";

// Idiomatic TypeORM setup for a small Express app: a single `data-source.ts` exporting the
// `DataSource` instance, initialized once in `server.ts` before the HTTP server starts listening
// (the standard pattern from TypeORM's own "Express" quick-start guide).
export const AppDataSource = new DataSource({
    type: "postgres",
    host: "localhost",
    port: 5433,
    username: "postgres",
    password: "postgres",
    database: "raw_express",
    synchronize: true,
    entities: [Todo],
});
