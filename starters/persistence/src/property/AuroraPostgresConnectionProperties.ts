/**
 * Postgres-specific connection options for Aurora.
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
export interface AuroraPostgresConnectionProperties {
    /**
     * AWS region where the Aurora Postgres instance is deployed.
     */
    readonly region: string;

    /**
     * AWS Secrets Manager ARN for database credentials.
     */
    readonly secretArn: string;

    /**
     * AWS RDS resource ARN for the Aurora cluster.
     */
    readonly resourceArn: string;

    /**
     * Database name to connect to.
     */
    readonly database: string;

    /**
     * The Postgres extension used for UUID generation.
     * Defaults to 'uuid-ossp'.
     * - 'pgcrypto': uses `gen_random_uuid()` function.
     * - 'uuid-ossp': uses `uuid_generate_v4()` function.
     */
    readonly uuidExtension?: "pgcrypto" | "uuid-ossp";

    /**
     * Whether to transform parameters.
     */
    readonly transformParameters?: boolean;

    /**
     * `poolSize` is not supported and should not be provided.
     */
    readonly poolSize?: never;
}
