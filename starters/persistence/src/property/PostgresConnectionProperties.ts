import {PostgresConnectionCredentialsOptions} from "typeorm/driver/postgres/PostgresConnectionCredentialsOptions";

/**
 * Postgres-specific connection options.
 *
 * Extends the basic Postgres credentials options with additional properties such as replication,
 * schema, timezone handling, and extension management.
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
export interface PostgresConnectionProperties extends PostgresConnectionCredentialsOptions {
    /**
     * Schema name.
     */
    readonly schema?: string;

    /**
     * A boolean determining whether to pass time values in UTC or local time. (default: false).
     */
    readonly useUTC?: boolean;

    /**
     * Replication setup.
     */
    readonly replication?: {
        /**
         * Master server used by ORM to perform writes.
         */
        readonly master: PostgresConnectionCredentialsOptions;

        /**
         * List of read-from servers (slaves).
         */
        readonly slaves: PostgresConnectionCredentialsOptions[];
    };

    /**
     * The milliseconds before a timeout occurs during the initial connection to the Postgres
     * server. If undefined or set to 0, there is no timeout. Defaults to undefined.
     */
    readonly connectTimeoutMS?: number;

    /**
     * The Postgres extension to use for generating UUID columns. Defaults to 'uuid-ossp'.
     *
     * - `pgcrypto`: Uses the `gen_random_uuid()` function.
     * - `uuid-ossp`: Uses the `uuid_generate_v4()` function.
     */
    readonly uuidExtension?: "pgcrypto" | "uuid-ossp";

    /**
     * Include notification messages from Postgres server in client logs.
     */
    readonly logNotifications?: boolean;

    /**
     * Automatically install Postgres extensions if they are missing.
     */
    readonly installExtensions?: boolean;

    /**
     * Sets the `application_name` variable to help DB administrators identify
     * the service using this connection. Defaults to 'undefined'.
     */
    readonly applicationName?: string;

    /**
     * Return 64-bit integers (int8) as JavaScript integers.
     *
     * JavaScript does not natively support 64-bit integers, so node-postgres returns int8
     * results as strings by default to avoid overflow issues. Enabling this will parse them
     * as numbers, but beware of the `Number.MAX_SAFE_INTEGER` limitation (+/- 2^53).
     *
     * @see [JavaScript Number objects](http://ecma262-5.com/ELS5_HTML.htm#Section_8.5)
     * @see [node-postgres int8 explanation](https://github.com/brianc/node-pg-types#:~:text=on%20projects%3A%20return-,64%2Dbit%20integers,-(int8)%20as)
     * @see [node-postgres defaults.parseInt8 implementation](https://github.com/brianc/node-postgres/blob/pg%408.8.0/packages/pg/lib/defaults.js#L80)
     */
    readonly parseInt8?: boolean;
}
