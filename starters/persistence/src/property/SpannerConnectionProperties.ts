import {SpannerConnectionCredentialsOptions} from "typeorm/driver/spanner/SpannerConnectionCredentialsOptions";

/**
 * Spanner specific connection options.
 * Extends base Spanner connection credentials with additional properties.
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
export interface SpannerConnectionProperties extends SpannerConnectionCredentialsOptions {
    /**
     * Database type.
     */
    readonly type: "spanner";

    /**
     * Database name.
     * @todo implement
     */
    readonly database?: string;

    /**
     * Database schema name.
     * @todo implement
     */
    readonly schema?: string;

    /**
     * The charset for the connection. This is called "collation" in the SQL-level of MySQL (like utf8_general_ci).
     * If a SQL-level charset is specified (like utf8mb4) then the default collation for that charset is used.
     * Default: 'UTF8_GENERAL_CI'
     */
    readonly charset?: string;

    /**
     * The timezone configured on the MySQL server.
     * Used to type cast server date/time values to JavaScript Date objects and vice versa.
     * Can be 'local', 'Z', or an offset in the form +HH:MM or -HH:MM.
     * Default: 'local'
     */
    readonly timezone?: string;

    /**
     * The milliseconds before a timeout occurs during the initial connection to the MySQL server.
     * Default: 10000
     */
    readonly connectTimeout?: number;

    /**
     * The milliseconds before a timeout occurs during the initial connection to the MySQL server.
     * Difference between connectTimeout and acquireTimeout is subtle, see mysqljs/mysql docs:
     * https://github.com/mysqljs/mysql/tree/master#pool-options
     * Default: 10000
     */
    readonly acquireTimeout?: number;

    /**
     * Allow connecting to MySQL instances that ask for the old (insecure) authentication method.
     * Default: false
     */
    readonly insecureAuth?: boolean;

    /**
     * Enable support for big numbers (BIGINT and DECIMAL columns).
     * Default: false
     */
    readonly supportBigNumbers?: boolean;

    /**
     * When enabled with supportBigNumbers, forces big numbers to always be returned as strings.
     * Default: false
     */
    readonly bigNumberStrings?: boolean;

    /**
     * Force date types (TIMESTAMP, DATETIME, DATE) to be returned as strings rather than JavaScript Date objects.
     * Can be boolean or an array of type names.
     */
    readonly dateStrings?: boolean | string[];

    /**
     * Prints protocol details to stdout.
     * Can be boolean or an array of packet type names.
     * Default: false
     */
    readonly debug?: boolean | string[];

    /**
     * Generates stack traces on Error to include call site of library entrance ("long stack traces").
     * Slight performance penalty. Default: true
     */
    readonly trace?: boolean;

    /**
     * Allow multiple MySQL statements per query.
     * Be cautious, increases risk of SQL injection attacks.
     * Default: false
     */
    readonly multipleStatements?: boolean;

    /**
     * Use spatial functions like GeomFromText and AsText which are removed in MySQL 8.
     * Default: true
     */
    readonly legacySpatialSupport?: boolean;

    /**
     * List of connection flags to use other than the default ones.
     * See https://github.com/mysqljs/mysql#connection-flags for details.
     */
    readonly flags?: string[];

    /**
     * Replication setup.
     */
    readonly replication?: {
        /**
         * Master server used for writes.
         */
        readonly master: SpannerConnectionCredentialsOptions;

        /**
         * List of read-from servers (slaves).
         */
        readonly slaves: SpannerConnectionCredentialsOptions[];

        /**
         * If true, attempts to reconnect when connection fails.
         * Default: true
         */
        readonly canRetry?: boolean;

        /**
         * Number of errors before a node is removed.
         * Default: 5
         */
        readonly removeNodeErrorCount?: number;

        /**
         * Milliseconds before another connection attempt is made after failure.
         * If 0, node is removed and never reused.
         * Default: 0
         */
        readonly restoreNodeTimeout?: number;

        /**
         * How slaves are selected: RR (Round-Robin), RANDOM, or ORDER.
         */
        readonly selector?: "RR" | "RANDOM" | "ORDER";
    };

    /**
     * Explicitly disallowed property.
     */
    readonly poolSize?: never;
}
