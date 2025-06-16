import {DatabaseType, LoggerOptions} from "typeorm";
import {QueryCacheProperties} from "./QueryCacheProperties";
import {PrepareLogMessagesOptions} from "typeorm/logger/Logger";

/**
 * CommonDataSourceProperties is set of DataSource properties shared by all database types.
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
export interface CommonDataSourceProperties {
    /**
     * Database type. This value is required.
     */
    readonly type: DatabaseType;

    /**
     * Migrations table name, in case of different name from "migrations".
     * Accepts single string name.
     */
    readonly migrationsTableName?: string;

    /**
     * Transaction mode for migrations to run in
     */
    readonly migrationsTransactionMode?: "all" | "none" | "each";

    /**
     * Typeorm metadata table name, in case of different name from "typeorm_metadata".
     * Accepts single string name.
     */
    readonly metadataTableName?: string;

    /**
     * Logging options.
     */
    readonly logging?: LoggerOptions;

    readonly logFormat?: PrepareLogMessagesOptions;

    /**
     * Maximum number of milliseconds query should be executed before logger log a warning.
     */
    readonly maxQueryExecutionTime?: number;

    /**
     * Maximum number of clients the pool should contain.
     */
    readonly poolSize?: number;

    /**
     * Indicates if database schema should be auto created on every application launch.
     * Be careful with this option and don't use this in production - otherwise you can lose production data.
     * This option is useful during debug and development.
     * Alternative to it, you can use CLI and run schema:sync command.
     *
     * Note that for MongoDB database it does not create schema, because MongoDB is schemaless.
     * Instead, it syncs just by creating indices.
     */
    readonly synchronize?: boolean;

    /**
     * Indicates if migrations should be auto run on every application launch.
     * Alternative to it, you can use CLI and run migrations:run command.
     */
    readonly migrationsRun?: boolean;

    /**
     * Drops the schema each time connection is being established.
     * Be careful with this option and don't use this in production - otherwise you'll lose all production data.
     * This option is useful during debug and development.
     */
    readonly dropSchema?: boolean;

    /**
     * Prefix to use on all tables (collections) of this connection in the database.
     */
    readonly entityPrefix?: string;

    /**
     * When creating new Entity instances, skip all constructors when true.
     */
    readonly entitySkipConstructor?: boolean;

    /**
     * Extra connection options to be passed to the underlying driver.
     *
     * todo: deprecate this and move all database-specific types into hts own connection options object.
     */
    readonly extra?: any;

    /**
     * Specifies how relations must be loaded - using "joins" or separate queries.
     * If you are loading too much data with nested joins it's better to load relations
     * using separate queries.
     *
     * Default strategy is "join", but this default can be changed here.
     * Also, strategy can be set per-query in FindOptions and QueryBuilder.
     */
    readonly relationLoadStrategy?: "join" | "query";

    /**
     * Optionally applied "typename" to the model.
     * If set, then each hydrated model will have this property with the target model / entity name inside.
     *
     * (works like a discriminator property).
     */
    readonly typename?: string;

    /**
     * Holds reference to the baseDirectory where configuration file are expected.
     *
     * @internal
     */
    baseDirectory?: string;

    /**
     * Allows to setup cache options.
     */
    readonly cache?: boolean | QueryCacheProperties;
}
