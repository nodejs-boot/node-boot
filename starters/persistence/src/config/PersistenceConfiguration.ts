import {Bean, Configuration} from "@node-boot/core";
import {DataSource, EntityManager} from "typeorm";
import {ApplicationContext, BeansContext} from "@node-boot/context";
import {DataSourceOptions} from "typeorm/data-source/DataSourceOptions";
import {PersistenceContext} from "../PersistenceContext";
import {PERSISTENCE_CONFIG_PATH} from "../types";
import {REQUIRES_FIELD_INJECTION_KEY} from "@node-boot/di";

/**
 * The PersistenceConfiguration class is responsible for configuring the persistence layer of the application.
 * It defines two beans: dataSource and entityManager, which are used to manage the database connection and perform database operations.
 *
 * <i>Main functionalities</i>:
 * * Configuring the DataSource bean for the persistence layer.
 * * Initializing the DataSource and running migrations if enabled.
 * * Binding data repositories to the DI container.
 *
 *  @author manusant (ney.br.santos@gmail.com)
 * */
@Configuration()
export class PersistenceConfiguration {
    @Bean()
    public dataSource({iocContainer, logger, config}: BeansContext): DataSource {
        logger.info("Configuring persistence DataSource");
        const datasourceConfig = iocContainer.get("datasource-config") as DataSourceOptions;

        const entities = PersistenceContext.get().repositories.map(repository => repository.entity);

        const dataSource = new DataSource({
            ...datasourceConfig,
            entities,
        });

        dataSource
            .initialize()
            .then(() => {
                logger.info("Persistence DataSource successfully initialized");

                // Run migrations if enabled
                const runMigrations = config.getOptionalBoolean(
                    `${PERSISTENCE_CONFIG_PATH}.runMigrations`,
                );
                if (runMigrations) {
                    logger.info("Running migrations");
                    dataSource
                        .runMigrations()
                        .then(migrations => {
                            logger.info(`${migrations.length} migration was successfully executed`);
                        })
                        .catch(reason => {
                            logger.info(`Migrations failed due to:`, reason);
                        });
                }

                // Inject dependencies into Subscriber instances
                for (const subscriber of dataSource.subscribers) {
                    for (const fieldToInject of Reflect.getMetadata(
                        REQUIRES_FIELD_INJECTION_KEY,
                        subscriber,
                    ) || []) {
                        // Extract type metadata for field injection. This is useful for custom injection in some modules
                        const propertyType = Reflect.getMetadata(
                            "design:type",
                            subscriber,
                            fieldToInject,
                        );
                        subscriber[fieldToInject] = iocContainer.get(propertyType);
                    }
                }

                // Bind Data Repositories if DI container is configured
                const context = ApplicationContext.get();
                if (context.diOptions) {
                    logger.info(`Binding persistence repositories`);
                    context.repositoriesAdapter?.bind(context.diOptions.iocContainer);
                } else {
                    throw new Error(
                        "diOptions with an IOC Container is required for Data Repositories",
                    );
                }
            })
            .catch(err => {
                logger.error("Error during Persistence DataSource initialization", err);
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
