import {OracleConnectionCredentialsOptions} from "typeorm/driver/oracle/OracleConnectionCredentialsOptions";

/**
 * Oracle-specific connection options.
 * Extends Oracle connection credentials with additional settings.
 */
export interface OracleConnectionProperties extends OracleConnectionCredentialsOptions {
    /**
     * Schema name. Defaults to `"public"` if not specified.
     */
    readonly schema?: string;

    /**
     * Determines whether to pass time values in UTC or local time.
     * Defaults to `false` (use local time).
     */
    readonly useUTC?: boolean;

    /**
     * Replication configuration for Oracle connections.
     */
    readonly replication?: {
        /**
         * Master server connection options used by ORM to perform writes.
         */
        readonly master: OracleConnectionCredentialsOptions;

        /**
         * List of read-only servers (slaves) for read operations.
         */
        readonly slaves: OracleConnectionCredentialsOptions[];
    };
}
