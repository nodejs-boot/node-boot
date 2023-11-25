import {Bean, Configuration} from "@node-boot/core";
import {BeansContext} from "@node-boot/context";
import {DataSource} from "typeorm";
import {
    addTransactionalDataSource,
    initializeTransactionalContext,
    StorageDriver,
} from "typeorm-transactional";

@Configuration()
export class TransactionConfiguration {
    @Bean()
    public transactionConfig({iocContainer, logger}: BeansContext) {
        logger.info("Configuring transactions");
        const dataSource = iocContainer.get(DataSource);

        // Enable transactions
        initializeTransactionalContext({storageDriver: StorageDriver.AUTO});
        addTransactionalDataSource(dataSource);
        logger.info(
            "Transactions successfully configured with storage driver in AUTO mode (AsyncLocalStorage when node >= 16 and cls-hooked otherwise)",
        );
    }
}
