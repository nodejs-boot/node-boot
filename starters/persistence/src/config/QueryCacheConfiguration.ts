import {Bean, Configuration} from "@node-boot/core";
import {BeansContext} from "@node-boot/context";
import {DataSource} from "typeorm";
import {QueryResultCache} from "typeorm/cache/QueryResultCache";
import {QueryCacheProperties} from "../property/QueryCacheProperties";
import {PersistenceContext} from "../PersistenceContext";
import {PERSISTENCE_CONFIG_PATH} from "../types";

export const QUERY_CACHE_CONFIG = "query-cache-config";

export type QueryCacheConfig =
    | boolean
    | (QueryCacheProperties & {
          /**
           * Factory function for custom cache providers that implement QueryResultCache.
           */
          provider?: (connection: DataSource) => QueryResultCache;
      });

@Configuration()
export class QueryCacheConfiguration {
    @Bean()
    public queryCacheConfig({iocContainer, logger, config}: BeansContext) {
        logger.info("Preparing cache configurations");

        const persistenceProperties = config.getOptionalConfig(PERSISTENCE_CONFIG_PATH);

        if (persistenceProperties) {
            // Cache config can be a boolean or a complex config object
            const cacheConfig = persistenceProperties.getOptional<QueryCacheProperties>("cache");
            const cacheEnabled = persistenceProperties.getOptionalBoolean("cache");

            if (cacheConfig || cacheEnabled !== undefined) {
                let cacheProvider: any;
                // Setup cache provider if a custom provider is configured through @PersistenceCache decorator
                const QueryCache = PersistenceContext.get().queryCache;
                if (QueryCache) {
                    cacheProvider = (connection: DataSource) => new QueryCache(connection);
                }

                if (cacheConfig) {
                    logger.info(
                        `Configuring query cache with options from configuration${
                            cacheProvider ? " and custom cache provider" : ""
                        }`,
                    );
                    iocContainer.set(QUERY_CACHE_CONFIG, {
                        ...cacheConfig,
                        provider: cacheProvider,
                    });
                } else if (cacheProvider) {
                    logger.info(`Configuring query cache with custom cache provider`);
                    iocContainer.set(QUERY_CACHE_CONFIG, {
                        provider: cacheProvider,
                    });
                } else if (cacheEnabled) {
                    // If cache is only enabled, falling back to database cache or to a custom provider if specified
                    logger.info(
                        `${
                            cacheProvider
                                ? "Configuring custom query cache provider"
                                : "Enabling database query cache with default configurations"
                        }`,
                    );
                    iocContainer.set(
                        QUERY_CACHE_CONFIG,
                        cacheProvider ? {provider: cacheProvider} : true,
                    );
                } else {
                    // Cache is explicitly disabled
                    logger.warn(
                        "Persistence query cache is not enabled. Enable it to boost your application performance.",
                    );
                }
            }
        }
    }
}
