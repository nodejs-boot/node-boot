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
import {TransactionConfigProperties} from "./TransactionConfigProperties";

/**
 * Defines a comprehensive set of persistence properties combining common datasource properties
 * with specific connection properties for supported database types.
 *
 * Each key corresponds to a supported database type and maps to the connection properties specific to that database.
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
export type PersistenceProperties = CommonDataSourceProperties & {
    /**
     * Aurora MySQL specific connection properties.
     */
    "aurora-mysql": AuroraMysqlConnectionProperties;

    /**
     * Aurora PostgreSQL specific connection properties.
     */
    "aurora-postgres": AuroraPostgresConnectionProperties;

    /**
     * Better SQLite3 specific connection properties.
     */
    "better-sqlite3": BetterSqlite3ConnectionProperties;

    /**
     * CockroachDB specific connection properties.
     */
    cockroachdb: CockroachConnectionProperties;

    /**
     * MongoDB specific connection properties.
     */
    mongodb: MongoConnectionProperties;

    /**
     * MySQL specific connection properties.
     */
    mysql: MysqlConnectionProperties;

    /**
     * MariaDB uses the same connection properties as MySQL.
     */
    mariadb: MysqlConnectionProperties;

    /**
     * Oracle specific connection properties.
     */
    oracle: OracleConnectionProperties;

    /**
     * PostgreSQL specific connection properties.
     */
    postgres: PostgresConnectionProperties;

    /**
     * SAP specific connection properties.
     */
    sap: SapConnectionProperties;

    /**
     * Google Spanner specific connection properties.
     */
    spanner: SpannerConnectionProperties;

    /**
     * SQLite specific connection properties.
     */
    sqlite: SqliteConnectionProperties;

    /**
     * Microsoft SQL Server specific connection properties.
     */
    mssql: SqlServerConnectionProperties;

    /**
     * Optional configuration for transaction handling.
     */
    transactions?: TransactionConfigProperties;
};
