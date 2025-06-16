import {Bean, Configuration} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import {DataSourceOptions} from "typeorm/data-source/DataSourceOptions";
import {PersistenceContext} from "../PersistenceContext";
import {PersistenceProperties} from "../property/PersistenceProperties";
import {PersistenceLogger} from "../adapter/PersistenceLogger";
import {PERSISTENCE_CONFIG_PATH} from "../types";
import {QUERY_CACHE_CONFIG} from "./QueryCacheConfiguration";

/**
 * Configuration class responsible for creating and providing the
 * TypeORM DataSourceOptions bean configured with persistence settings.
 *
 * Retrieves persistence configuration properties, initializes the
 * persistence logger, sets up subscribers, migrations, naming strategy,
 * and query cache configuration for the data source.
 *
 * Throws errors if required configurations are missing or inconsistent.
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
@Configuration()
export class DataSourceConfiguration {
    /**
     * Provides the DataSourceOptions bean named "datasource-config".
     *
     * @param {BeansContext} context - The beans context containing config, iocContainer, and logger.
     * @returns {DataSourceOptions} The configured TypeORM DataSourceOptions.
     *
     * @throws {Error} If the persistence configuration node is missing.
     * @throws {Error} If no database-specific configuration found for the persistence type.
     * @throws {Error} If database type mismatches between configuration and overrides.
     * @throws {Error} If both synchronize and migrationsRun options are enabled.
     *
     * @author Manuel Santos <https://github.com/manusant>
     */
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
