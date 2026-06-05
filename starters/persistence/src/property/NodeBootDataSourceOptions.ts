import {MysqlDataSourceOptions} from "typeorm/driver/mysql/MysqlDataSourceOptions";
import {PostgresDataSourceOptions} from "typeorm/driver/postgres/PostgresDataSourceOptions";
import {CockroachDataSourceOptions} from "typeorm/driver/cockroachdb/CockroachDataSourceOptions";
import {SqljsDataSourceOptions} from "typeorm/driver/sqljs/SqljsDataSourceOptions";
import {SqlServerDataSourceOptions} from "typeorm/driver/sqlserver/SqlServerDataSourceOptions";
import {SapDataSourceOptions} from "typeorm/driver/sap/SapDataSourceOptions";
import {OracleDataSourceOptions} from "typeorm/driver/oracle/OracleDataSourceOptions";
import {MongoDataSourceOptions} from "typeorm/driver/mongodb/MongoDataSourceOptions";
import {AuroraMysqlDataSourceOptions} from "typeorm/driver/aurora-mysql/AuroraMysqlDataSourceOptions";
import {AuroraPostgresDataSourceOptions} from "typeorm/driver/aurora-postgres/AuroraPostgresDataSourceOptions";
import {BetterSqlite3DataSourceOptions} from "typeorm/driver/better-sqlite3/BetterSqlite3DataSourceOptions";
import {SpannerDataSourceOptions} from "typeorm/driver/spanner/SpannerDataSourceOptions";

type NotOverridable = "subscribers" | "namingStrategy" | "cache" | "logger" | "entities" | "migrations";

export type NodeBootDataSourceOptions =
    | Omit<MysqlDataSourceOptions, NotOverridable>
    | Omit<PostgresDataSourceOptions, NotOverridable>
    | Omit<CockroachDataSourceOptions, NotOverridable>
    | Omit<SqljsDataSourceOptions, NotOverridable>
    | Omit<SqlServerDataSourceOptions, NotOverridable>
    | Omit<SapDataSourceOptions, NotOverridable>
    | Omit<OracleDataSourceOptions, NotOverridable>
    | Omit<MongoDataSourceOptions, NotOverridable>
    | Omit<AuroraMysqlDataSourceOptions, NotOverridable>
    | Omit<AuroraPostgresDataSourceOptions, NotOverridable>
    | Omit<BetterSqlite3DataSourceOptions, NotOverridable>
    | Omit<SpannerDataSourceOptions, NotOverridable>;
