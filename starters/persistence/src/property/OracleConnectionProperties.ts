import {OracleConnectionCredentialsOptions} from "typeorm/driver/oracle/OracleConnectionCredentialsOptions";

/**
 * Oracle-specific connection options.
 */
export interface OracleConnectionProperties extends OracleConnectionCredentialsOptions {
    /**
     * Schema name. By default is "public".
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
         * Master server used by orm to perform writes.
         */
        readonly master: OracleConnectionCredentialsOptions;

        /**
         * List of read-from severs (slaves).
         */
        readonly slaves: OracleConnectionCredentialsOptions[];
    };
}
