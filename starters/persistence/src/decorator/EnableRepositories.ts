import {ApplicationContext} from "@nodeboot/context";
import {DefaultRepositoriesAdapter} from "../adapter";
import {DataSourceConfiguration, PersistenceConfiguration} from "../config";
import {TransactionConfiguration} from "../config/TransactionConfiguration";
import {QueryCacheConfiguration} from "../config/QueryCacheConfiguration";

/**
 * Class decorator to enable persistence repositories and configure the persistence layer.
 *
 * This decorator:
 * - Activates the persistence feature in the application context.
 * - Registers the default repositories adapter.
 * - Initializes query cache, datasource, persistence, and transaction configurations.
 *
 * Use this decorator on your main application class to bootstrap persistence support.
 *
 * @returns {ClassDecorator} The class decorator function.
 *
 * @example
 * ```ts
 * @EnableRepositories() // Enables persistence layer
 * @NodeBootApplication() // Activates Node-Boot framework features
 * export class SampleApplication implements NodeBootApp {
 *     start(): Promise<NodeBootAppView> {
 *         return NodeBoot.run(ExpressServer);
 *     }
 * }
 * ```
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
export const EnableRepositories = (): ClassDecorator => {
    return () => {
        ApplicationContext.get().applicationFeatures["persistence"] = true;

        // Register repositories adapter
        ApplicationContext.get().repositoriesAdapter = new DefaultRepositoriesAdapter();

        // Resolve query cache configurations
        new QueryCacheConfiguration();

        // Resolve data source configurations from configuration properties
        new DataSourceConfiguration();

        // Trigger persistence configuration
        new PersistenceConfiguration();

        // Trigger Transactions configuration
        new TransactionConfiguration();
    };
};
