/**
 * Sqlite-specific connection options.
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
export interface SqliteConnectionProperties {
    /**
     * Storage type or path to the storage file.
     */
    readonly database: string;

    /**
     * Encryption key for SQLCipher encrypted databases.
     */
    readonly key?: string;

    /**
     * When performing parallel writes, SQLite may return SQLITE_BUSY errors if another process
     * is writing to the database. SQLite cannot handle parallel saves.
     *
     * This option sets a retry timeout (in milliseconds) during which the ORM will repeatedly
     * try the write operation until it succeeds or the timeout is reached.
     *
     * Enabling Write-Ahead Logging (WAL) mode can reduce SQLITE_BUSY occurrences and improve performance.
     */
    readonly busyErrorRetry?: number;

    /**
     * Enables Write-Ahead Logging (WAL) mode.
     * Disabled by default.
     *
     * @see https://www.sqlite.org/wal.html
     */
    readonly enableWAL?: boolean;

    /**
     * Specifies the open file flags.
     * By default undefined.
     *
     * @see https://www.sqlite.org/c3ref/c_open_autoproxy.html
     * @see https://github.com/TryGhost/node-sqlite3/blob/master/test/open_close.test.js
     */
    readonly flags?: number;

    /**
     * Disallowed property to avoid confusion with pool management.
     */
    readonly poolSize?: never;

    /**
     * Sets or queries the busy timeout setting in milliseconds.
     * This controls how long SQLite will wait when the database is locked before returning SQLITE_BUSY.
     *
     * @see https://www.sqlite.org/pragma.html#pragma_busy_timeout
     */
    readonly busyTimeout?: number;
}
