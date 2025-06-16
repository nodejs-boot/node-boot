import {CockroachConnectionCredentialsOptions} from "typeorm/driver/cockroachdb/CockroachConnectionCredentialsOptions";

/**
 * Cockroachdb-specific connection options.
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
export interface CockroachConnectionProperties extends CockroachConnectionCredentialsOptions {
    /**
     * Enable time travel queries on cockroachdb.
     * https://www.cockroachlabs.com/docs/stable/as-of-system-time.html
     */
    readonly timeTravelQueries: boolean;

    /**
     * Schema name.
     */
    readonly schema?: string;

    /**
     * Replication setup.
     */
    readonly replication?: {
        /**
         * Master server used by orm to perform writes.
         */
        readonly master: CockroachConnectionCredentialsOptions;

        /**
         * List of read-from severs (slaves).
         */
        readonly slaves: CockroachConnectionCredentialsOptions[];
    };

    /**
     * sets the application_name var to help db administrators identify
     * the service using this connection. Defaults to 'undefined'
     */
    readonly applicationName?: string;

    /**
     * Max number of transaction retries in case of 40001 error.
     */
    readonly maxTransactionRetries?: number;
}
