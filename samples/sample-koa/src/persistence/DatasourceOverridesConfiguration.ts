import {DatasourceConfiguration} from "@node-boot/starter-persistence";

@DatasourceConfiguration({
    type: "better-sqlite3",
    database: "express-sample.db",
    synchronize: true,
    migrationsRun: true,
})
export class DatasourceOverridesConfiguration {}
