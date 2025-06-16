import {AuroraMysqlConnectionCredentialsOptions} from "typeorm/driver/aurora-mysql/AuroraMysqlConnectionCredentialsOptions";

/**
 * Connection properties specific to Aurora MySQL.
 *
 * Extends the standard Aurora MySQL credentials options with additional
 * AWS-specific parameters such as region, secret ARN, and resource ARN.
 *
 * @see https://github.com/mysqljs/mysql#connection-options
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
export interface AuroraMysqlConnectionProperties extends AuroraMysqlConnectionCredentialsOptions {
    /**
     * AWS region where the Aurora MySQL instance is deployed.
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
     * Whether to use legacy spatial functions such as `GeomFromText` and `AsText`.
     * These functions were removed in MySQL 8.
     *
     * @default true
     */
    readonly legacySpatialSupport?: boolean;

    /**
     * `poolSize` is not supported and should not be provided.
     */
    readonly poolSize?: never;
}
