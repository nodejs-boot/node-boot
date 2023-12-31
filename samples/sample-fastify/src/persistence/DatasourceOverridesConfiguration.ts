import {DatasourceConfiguration} from "@node-boot/starter-persistence";

@DatasourceConfiguration({
    type: "better-sqlite3",
    database: "fastify-sample.db",
    synchronize: false,
    migrationsRun: true,
})
export class DatasourceOverridesConfiguration {}
