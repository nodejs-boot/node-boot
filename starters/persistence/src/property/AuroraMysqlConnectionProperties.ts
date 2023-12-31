import {AuroraMysqlConnectionCredentialsOptions} from "typeorm/driver/aurora-mysql/AuroraMysqlConnectionCredentialsOptions";

/**
 * MySQL specific connection options.
 *
 * @see https://github.com/mysqljs/mysql#connection-options
 */
export interface AuroraMysqlConnectionProperties extends AuroraMysqlConnectionCredentialsOptions {
    readonly region: string;

    readonly secretArn: string;

    readonly resourceArn: string;

    readonly database: string;
    /**
     * Use spatial functions like GeomFromText and AsText which are removed in MySQL 8.
     * (Default: true)
     */
    readonly legacySpatialSupport?: boolean;

    readonly poolSize?: never;
}
