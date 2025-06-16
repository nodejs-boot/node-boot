import {Bean, Configuration} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import {DataSource} from "typeorm";
import {QueryResultCache} from "typeorm/cache/QueryResultCache";
import {QueryCacheProperties} from "../property/QueryCacheProperties";
import {PersistenceContext} from "../PersistenceContext";
import {PERSISTENCE_CONFIG_PATH} from "../types";

export const QUERY_CACHE_CONFIG = "query-cache-config";

/**
 * Configuration type for query cache.
 * Can be a boolean flag or a configuration object with optional custom provider factory.
 *
 * @typedef {boolean | (QueryCacheProperties & { provider?: (connection: DataSource) => QueryResultCache })} QueryCacheConfig
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
export type QueryCacheConfig =
    | boolean
    | (QueryCacheProperties & {
          /**
           * Factory function for custom cache providers that implement QueryResultCache.
           */
          provider?: (connection: DataSource) => QueryResultCache;
      });

/**
 * QueryCacheConfiguration class responsible for setting up
 * query cache configurations based on application properties.
 * It integrates with PersistenceContext to optionally use a custom query cache provider.
 *
 * Supports enabling/disabling cache, using complex configuration options,
 * or providing a custom cache provider factory.
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
@Configuration()
export class QueryCacheConfiguration {
    /**
     * Configures the query cache settings bean.
     *
     * - Reads persistence configuration from application config.
     * - Checks if caching is enabled or custom cache options are set.
     * - If a custom QueryCache class is provided in PersistenceContext, uses it as a provider.
     * - Sets up the IoC container binding with the cache config or provider.
     * - Logs relevant information and warnings during configuration.
     *
     * @param {BeansContext} context - The context containing iocContainer, logger, and config.
     * @returns {void}
     *
     * @author Manuel Santos <https://github.com/manusant>
     */
    @Bean()
    public queryCacheConfig({iocContainer, logger, config}: BeansContext): void {
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
                    iocContainer.set(QUERY_CACHE_CONFIG, cacheProvider ? {provider: cacheProvider} : true);
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
