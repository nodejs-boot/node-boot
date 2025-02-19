import {DatasourceConfiguration} from "@nodeboot/starter-persistence";

@DatasourceConfiguration({
    type: "better-sqlite3",
    database: "express-sample.db",
    synchronize: false,
    migrationsRun: true,
})
export class DatasourceOverridesConfiguration {}
