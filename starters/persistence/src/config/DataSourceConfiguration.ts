import {Bean, Configuration} from "@node-boot/core";
import {BeansContext} from "@node-boot/context";
import {DataSourceOptions} from "typeorm/data-source/DataSourceOptions";
import {PersistenceContext} from "../PersistenceContext";
import {PersistenceProperties} from "../property/PersistenceProperties";
import {PersistenceLogger} from "../adapter/PersistenceLogger";
import {PERSISTENCE_CONFIG_PATH} from "../types";
import {QUERY_CACHE_CONFIG} from "./QueryCacheConfiguration";

@Configuration()
export class DataSourceConfiguration {
    @Bean("datasource-config")
    public dataSourceConfig({config, iocContainer, logger}: BeansContext): DataSourceOptions {
        const persistenceProperties = config.get<PersistenceProperties>(PERSISTENCE_CONFIG_PATH);
        if (!persistenceProperties) {
            throw new Error(`'${PERSISTENCE_CONFIG_PATH}' configuration node is required when persistence is enabled. 
            Please add the persistence configuration depending on the data source you are using or remove 
            the @EnableRepositories from your application.`);
        }

        const persistenceLogger = new PersistenceLogger(logger, persistenceProperties);
        const {databaseConnectionOverrides, eventSubscribers, migrations, namingStrategy} = PersistenceContext.get();

        const strategy = namingStrategy ? new namingStrategy() : undefined;

        let cacheConfig;
        if (iocContainer.has(QUERY_CACHE_CONFIG)) {
            cacheConfig = iocContainer.get(QUERY_CACHE_CONFIG);
        } else {
            logger.warn("No query cache configuration found while building datasource configuration");
        }

        let databaseConfigs = persistenceProperties[persistenceProperties.type];
        if (!databaseConfigs) {
            throw new Error(
                `Invalid persistence configuration. No database specific configuration found for ${persistenceProperties.type} database under ${PERSISTENCE_CONFIG_PATH}' configuration node.`,
            );
        }
        // Set the type from configurations to the driver/connection type
        databaseConfigs.type = persistenceProperties.type;

        logger.info(`${eventSubscribers.length} subscribers found and ready to be registered`);
        logger.info(`${migrations.length} migrations found and ready to be registered`);

        if (databaseConnectionOverrides) {
            if (databaseConnectionOverrides.type !== persistenceProperties.type) {
                throw new Error(`Database type mismatch between configuration properties (${persistenceProperties.type}) 
                and @DatasourceConfiguration(...) (${databaseConnectionOverrides.type})`);
            }

            databaseConfigs = {
                ...databaseConfigs,
                ...(databaseConnectionOverrides as any),
            };
        }

        if (databaseConfigs.synchronize && databaseConfigs.migrationsRun) {
            throw new Error(
                `Only one of "synchronize" or "migrationsRun" config property can be enabled. Please set one of them to false`,
            );
        }

        // Save the synchronization and migration state
        PersistenceContext.get().synchronizeDatabase = databaseConfigs.synchronize;
        PersistenceContext.get().migrationsRun = databaseConfigs.migrationsRun;

        return {
            ...databaseConfigs,
            namingStrategy: strategy,
            subscribers: eventSubscribers,
            migrations: migrations,
            logger: persistenceLogger,
            cache: cacheConfig,
            // IMPORTANT: Disable synchronization and migrations run during datasource initialization. If enabled it will be synced afterward
            // If enabled here it will cause injection issues
            synchronize: false,
            migrationsRun: false,
        };
    }
}
