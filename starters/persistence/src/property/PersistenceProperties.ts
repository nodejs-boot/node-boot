import {CommonDataSourceProperties} from "./CommonDataSourceProperties";
import {MysqlConnectionProperties} from "./MysqlConnectionProperties";
import {PostgresConnectionProperties} from "./PostgresConnectionProperties";
import {AuroraPostgresConnectionProperties} from "./AuroraPostgresConnectionProperties";
import {AuroraMysqlConnectionProperties} from "./AuroraMysqlConnectionProperties";
import {BetterSqlite3ConnectionProperties} from "./BetterSqlite3ConnectionProperties";
import {CockroachConnectionProperties} from "./CockroachConnectionProperties";
import {MongoConnectionProperties} from "./MongoConnectionProperties";
import {OracleConnectionProperties} from "./OracleConnectionProperties";
import {SapConnectionProperties} from "./SapConnectionProperties";
import {SpannerConnectionProperties} from "./SpannerConnectionProperties";
import {SqliteConnectionProperties} from "./SqliteConnectionProperties";
import {SqlServerConnectionProperties} from "./SqlServerConnectionProperties";

export type PersistenceProperties = CommonDataSourceProperties & {
    "aurora-mysql": AuroraMysqlConnectionProperties;
    "aurora-postgres": AuroraPostgresConnectionProperties;
    "better-sqlite3": BetterSqlite3ConnectionProperties;
    cockroachdb: CockroachConnectionProperties;
    mongodb: MongoConnectionProperties;
    mysql: MysqlConnectionProperties;
    mariadb: MysqlConnectionProperties;
    oracle: OracleConnectionProperties;
    postgres: PostgresConnectionProperties;
    sap: SapConnectionProperties;
    spanner: SpannerConnectionProperties;
    sqlite: SqliteConnectionProperties;
    mssql: SqlServerConnectionProperties;
};
