import {SapConnectionCredentialsOptions} from "typeorm/driver/sap/SapConnectionCredentialsOptions";

/**
 * SAP Hana specific connection options.
 */
export interface SapConnectionProperties extends SapConnectionCredentialsOptions {
    /**
     * Database schema.
     */
    readonly schema?: string;

    /**
     * Pool options.
     */
    readonly pool?: {
        /**
         * Max number of connections.
         */
        readonly max?: number;

        /**
         * Minimum number of connections.
         */
        readonly min?: number;

        /**
         * Maximum number of waiting requests allowed. (default=0, no limit).
         */
        readonly maxWaitingRequests?: number;
        /**
         * Max milliseconds a request will wait for a resource before timing out. (default=5000)
         */
        readonly requestTimeout?: number;
        /**
         * How often to run resource timeout checks. (default=0, disabled)
         */
        readonly checkInterval?: number;
        /**
         * Idle timeout
         */
        readonly idleTimeout?: number;
    };

    readonly poolSize?: never;
}
