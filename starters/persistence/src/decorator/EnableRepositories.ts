import {ApplicationContext} from "@nodeboot/context";
import {DefaultRepositoriesAdapter} from "../adapter";
import {DataSourceConfiguration, PersistenceConfiguration} from "../config";
import {TransactionConfiguration} from "../config/TransactionConfiguration";
import {QueryCacheConfiguration} from "../config/QueryCacheConfiguration";

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
