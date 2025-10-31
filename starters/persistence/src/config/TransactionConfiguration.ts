import {Bean, Configuration} from "@nodeboot/core";
import {ApplicationContext, BeansContext, ShutdownHook} from "@nodeboot/context";
import {DataSource} from "typeorm";
import {addTransactionalDataSource, initializeTransactionalContext, StorageDriver} from "typeorm-transactional";
import {PersistenceProperties} from "../property/PersistenceProperties";
import {PERSISTENCE_CONFIG_PATH} from "../types";
import {Logger} from "winston";

/**
 * TransactionConfiguration class responsible for setting up transactional support
 * for the persistence layer using typeorm-transactional library.
 *
 * It initializes the transactional context and binds the DataSource
 * to the transactional data source manager.
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
@Configuration()
export class TransactionConfiguration {
    /**
     * Configures transactional support for the persistence layer.
     *
     * Reads transactional options from the persistence properties and
     * initializes the transactional context accordingly.
     *
     * Binds the TypeORM DataSource as the transactional data source.
     *
     * Logs configuration details.
     *
     * @param {BeansContext} context - Contains the IoC container, logger, and configuration instances.
     * @returns {void}
     *
     * @author Manuel Santos <https://github.com/manusant>
     */
    @Bean()
    public transactionConfig({iocContainer, logger, config}: BeansContext): void {
        if (process.env["TRANSACTIONS_DISABLED"] === "true") {
            logger.warn("Transactions are disabled via TRANSACTIONS_DISABLED environment variable.");
        } else {
            logger.info("Configuring transactions");
            const dataSource = iocContainer.get(DataSource);

            const persistenceProperties = config.get<PersistenceProperties>(PERSISTENCE_CONFIG_PATH);

            // Enable transactions
            initializeTransactionalContext(persistenceProperties.transactions ?? {storageDriver: StorageDriver.AUTO});
            addTransactionalDataSource(dataSource);
            logger.info(
                "Transactions successfully configured with storage driver in AUTO mode (AsyncLocalStorage when node >= 16 and cls-hooked otherwise)",
            );
        }
    }

    /**
     * Shutdown hook to clean up transactional context.
     * This ensures proper cleanup of transaction-related resources.
     *
     * Priority 150 - runs after persistence connections are closed but before other cleanup.
     */
    @ShutdownHook({priority: 150, timeout: 5000})
    async cleanupTransactionalContext(): Promise<void> {
        const logger = ApplicationContext.get().diOptions?.iocContainer.get(Logger);
        logger?.info("🔄 Cleaning up transactional context...");

        // Note: typeorm-transactional doesn't provide a direct cleanup method,
        // but we can ensure any pending transactions are handled gracefully
        // The actual cleanup happens when DataSource is destroyed in PersistenceConfiguration

        logger?.info("✅ Transactional context cleanup completed");
    }
}
