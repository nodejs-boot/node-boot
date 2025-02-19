import {Bean, Configuration} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import {DataSource} from "typeorm";
import {addTransactionalDataSource, initializeTransactionalContext, StorageDriver} from "typeorm-transactional";
import {PersistenceProperties} from "../property/PersistenceProperties";
import {PERSISTENCE_CONFIG_PATH} from "../types";

@Configuration()
export class TransactionConfiguration {
    @Bean()
    public transactionConfig({iocContainer, logger, config}: BeansContext) {
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
