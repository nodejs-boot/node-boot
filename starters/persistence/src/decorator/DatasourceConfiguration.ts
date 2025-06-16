import {PersistenceContext} from "../PersistenceContext";
import {NodeBootDataSourceOptions} from "../property/NodeBootDataSourceOptions";

/**
 * Class decorator to override the default persistence datasource configuration.
 *
 * This decorator sets custom database connection options that will override
 * the default persistence configuration in the PersistenceContext.
 *
 * @param {NodeBootDataSourceOptions} options - The custom datasource options to override the default configuration.
 * @returns {ClassDecorator} The class decorator function.
 *
 * @example
 * ```ts
 * @DatasourceConfiguration({
 *   type: "postgres",
 *   host: "localhost",
 *   port: 5432,
 *   username: "user",
 *   password: "pass",
 *   database: "mydb",
 * })
 * class MyCustomDatasourceConfig {}
 * ```
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
export function DatasourceConfiguration(options: NodeBootDataSourceOptions): ClassDecorator {
    return () => {
        PersistenceContext.get().databaseConnectionOverrides = options;
    };
}
