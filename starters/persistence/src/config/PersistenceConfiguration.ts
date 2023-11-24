import {Bean, Configuration} from "@node-boot/core";
import {DataSource, EntityManager} from "typeorm";
import {ApplicationContext, BeansContext} from "@node-boot/context";
import {DataSourceOptions} from "typeorm/data-source/DataSourceOptions";

/**
 * The PersistenceConfiguration class is a configuration class that is responsible for configuring and providing the
 * necessary persistence components, such as the data source and entity manager.
 * */
@Configuration()
export class PersistenceConfiguration {
    @Bean()
    public dataSource({iocContainer, logger}: BeansContext): DataSource {
        logger.info("Configuring persistence DataSource");
        const config = iocContainer.get(
            "datasource-config",
        ) as DataSourceOptions;

        const entities = ApplicationContext.get().repositories.map(
            repository => repository.entity,
        );
        const dataSource = new DataSource({
            ...config,
            entities,
        });

        dataSource
            .initialize()
            .then(() => {
                logger.info("Persistence DataSource successfully initialized");
                const context = ApplicationContext.get();
                if (context.diOptions) {
                    logger.info(`Binding persistence repositories`);
                    context.repositoriesAdapter?.bind(
                        context.diOptions.iocContainer,
                    );
                } else {
                    throw new Error(
                        "diOptions with an IOC Container is required for Data Repositories",
                    );
                }
            })
            .catch(err => {
                logger.error(
                    "Error during Persistence DataSource initialization",
                    err,
                );
                process.exit(1);
            });
        logger.info("DataSource bean provided successfully");
        return dataSource;
    }

    @Bean()
    public entityManager({iocContainer, logger}: BeansContext): EntityManager {
        logger.info("Providing EntityManager");
        const dataSource = iocContainer.get(DataSource);
        logger.info("EntityManager bean provided successfully");
        return dataSource.manager;
    }
}
