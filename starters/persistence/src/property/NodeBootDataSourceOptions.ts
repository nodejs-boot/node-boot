import {MysqlConnectionOptions} from "typeorm/driver/mysql/MysqlConnectionOptions";
import {PostgresConnectionOptions} from "typeorm/driver/postgres/PostgresConnectionOptions";
import {CockroachConnectionOptions} from "typeorm/driver/cockroachdb/CockroachConnectionOptions";
import {SqliteConnectionOptions} from "typeorm/driver/sqlite/SqliteConnectionOptions";
import {SqlServerConnectionOptions} from "typeorm/driver/sqlserver/SqlServerConnectionOptions";
import {SapConnectionOptions} from "typeorm/driver/sap/SapConnectionOptions";
import {OracleConnectionOptions} from "typeorm/driver/oracle/OracleConnectionOptions";
import {MongoConnectionOptions} from "typeorm/driver/mongodb/MongoConnectionOptions";
import {AuroraMysqlConnectionOptions} from "typeorm/driver/aurora-mysql/AuroraMysqlConnectionOptions";
import {AuroraPostgresConnectionOptions} from "typeorm/driver/aurora-postgres/AuroraPostgresConnectionOptions";
import {BetterSqlite3ConnectionOptions} from "typeorm/driver/better-sqlite3/BetterSqlite3ConnectionOptions";
import {SpannerConnectionOptions} from "typeorm/driver/spanner/SpannerConnectionOptions";

type NotOverridable = "subscribers" | "namingStrategy" | "cache" | "logger" | "entities" | "migrations";

export type NodeBootDataSourceOptions =
    | Omit<MysqlConnectionOptions, NotOverridable>
    | Omit<PostgresConnectionOptions, NotOverridable>
    | Omit<CockroachConnectionOptions, NotOverridable>
    | Omit<SqliteConnectionOptions, NotOverridable>
    | Omit<SqlServerConnectionOptions, NotOverridable>
    | Omit<SapConnectionOptions, NotOverridable>
    | Omit<OracleConnectionOptions, NotOverridable>
    | Omit<MongoConnectionOptions, NotOverridable>
    | Omit<AuroraMysqlConnectionOptions, NotOverridable>
    | Omit<AuroraPostgresConnectionOptions, NotOverridable>
    | Omit<BetterSqlite3ConnectionOptions, NotOverridable>
    | Omit<SpannerConnectionOptions, NotOverridable>;
