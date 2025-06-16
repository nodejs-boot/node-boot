import {SapConnectionCredentialsOptions} from "typeorm/driver/sap/SapConnectionCredentialsOptions";

/**
 * SAP Hana specific connection options.
 * Extends the base SAP connection credentials options with additional properties.
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
export interface SapConnectionProperties extends SapConnectionCredentialsOptions {
    /**
     * Database schema.
     */
    readonly schema?: string;

    /**
     * Pool options for managing SAP connection pool behavior.
     */
    readonly pool?: {
        /**
         * Maximum number of connections in the pool.
         */
        readonly max?: number;

        /**
         * Minimum number of connections to maintain in the pool.
         */
        readonly min?: number;

        /**
         * Maximum number of waiting requests allowed in the queue.
         * Defaults to 0, which means no limit.
         */
        readonly maxWaitingRequests?: number;

        /**
         * Maximum time in milliseconds a request will wait for a resource
         * before timing out. Defaults to 5000 ms.
         */
        readonly requestTimeout?: number;

        /**
         * Interval in milliseconds to run resource timeout checks.
         * Defaults to 0 (disabled).
         */
        readonly checkInterval?: number;

        /**
         * Time in milliseconds before an idle connection is closed.
         */
        readonly idleTimeout?: number;
    };

    /**
     * Deprecated or unsupported property for SAP connections.
     * Explicitly disallowed to avoid misuse.
     */
    readonly poolSize?: never;
}
