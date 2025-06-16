/**
 * Sqlite-specific connection options.
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
export interface BetterSqlite3ConnectionProperties {
    /**
     * Storage type or path to the storage.
     */
    readonly database: string;

    /**
     * The driver object
     * This defaults to require("better-sqlite3")
     */
    readonly driver?: any;

    /**
     * Encryption key for for SQLCipher.
     */
    readonly key?: string;

    /**
     * Cache size of sqlite statement to speed up queries.
     * Default: 100.
     */
    readonly statementCacheSize?: number;

    /**
     * Open the database connection in readonly mode.
     * Default: false.
     */
    readonly readonly?: boolean;

    /**
     * If the database does not exist, an Error will be thrown instead of creating a new file.
     * This option does not affect in-memory or readonly database connections.
     * Default: false.
     */
    readonly fileMustExist?: boolean;

    /**
     * The number of milliseconds to wait when executing queries
     * on a locked database, before throwing a SQLITE_BUSY error.
     * Default: 5000.
     */
    readonly timeout?: number;

    /**
     * Relative or absolute path to the native addon (better_sqlite3.node).
     */
    readonly nativeBinding?: string;

    readonly poolSize?: never;

    /**
     * Enables WAL mode. By default its disabled.
     *
     * @see https://www.sqlite.org/wal.html
     */
    readonly enableWAL?: boolean;
}
