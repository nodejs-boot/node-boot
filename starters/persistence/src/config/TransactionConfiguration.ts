import {Bean, Configuration} from "@nodeboot/core";
import {ApplicationContext, BeansContext, ShutdownHook} from "@nodeboot/context";
import {DataSource} from "typeorm";
import {PersistenceProperties} from "../property/PersistenceProperties";
import {PERSISTENCE_CONFIG_PATH} from "../types";
import {Logger} from "winston";
import {addTransactionalDataSource, initializeTransactionalContext} from "../transaction";

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
        const persistenceProperties = config.get<PersistenceProperties>(PERSISTENCE_CONFIG_PATH);

        logger.info("Configuring transactions");
        const dataSource = iocContainer.get(DataSource);

        // Enable transactions for all supported data sources.
        initializeTransactionalContext(persistenceProperties.transactions);

        if (persistenceProperties.type === "mongodb") {
            // MongoDB does not need SQL DataSource patching and runs with driver-level query runner transactions.
            addTransactionalDataSource({
                dataSource,
                patch: false,
            });
            logger.info("MongoDB transactions configured with AsyncLocalStorage context propagation");
            return;
        }

        addTransactionalDataSource(dataSource);
        logger.info("Transactions successfully configured with AsyncLocalStorage context propagation");
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
