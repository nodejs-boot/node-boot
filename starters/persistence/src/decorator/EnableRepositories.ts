import {ApplicationContext} from "@node-boot/context";
import {DefaultRepositoriesAdapter} from "../adapter";
import {DataSourceConfiguration, PersistenceConfiguration} from "../config";

export const EnableRepositories = (): ClassDecorator => {
    return (target: Function) => {
        // Register repositories adapter
        ApplicationContext.get().repositoriesAdapter =
            new DefaultRepositoriesAdapter();

        // Resolve data source configurations from configuration properties
        new DataSourceConfiguration();

        // Trigger persistence configuration
        new PersistenceConfiguration();
    };
};
