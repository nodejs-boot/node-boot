import {Bean, Configuration} from "@node-boot/core";
import {DataSource, EntityManager} from "typeorm";
import {ApplicationContext, BeansContext, IocContainer} from "@node-boot/context";
import {DataSourceOptions} from "typeorm/data-source/DataSourceOptions";
import {PersistenceContext} from "../PersistenceContext";
import {REQUIRES_FIELD_INJECTION_KEY} from "@node-boot/di";
import {Logger} from "winston";

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

                const {synchronizeDatabase, migrationsRun} = PersistenceContext.get();
                // Inject dependencies into Subscriber instances
                PersistenceConfiguration.setupInjection(logger, dataSource, iocContainer);

                const initializationPromises: Promise<unknown>[] = [];
                // Run migrations if enabled
                if (migrationsRun) {
                    initializationPromises.push(
                        PersistenceConfiguration.runMigration(logger, dataSource),
                    );
                }

                if (synchronizeDatabase) {
                    initializationPromises.push(
                        PersistenceConfiguration.runDatabaseSync(logger, dataSource),
                    );
                }

                // Bind Data Repositories if DI container is configured
                PersistenceConfiguration.bindDataRepositories(logger);

                // Validate database consistency
                Promise.all(initializationPromises).then(_ =>
                    PersistenceConfiguration.ensureDatabase(logger, dataSource),
                );
            })
            .catch(err => {
                logger.error("Error during Persistence DataSource initialization:", err);
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

    static setupInjection(
        logger: Logger,
        dataSource: DataSource,
        iocContainer: IocContainer<unknown>,
    ) {
        const subscribers = dataSource.subscribers;
        logger.info(
            `Setting up dependency injection for ${subscribers.length} persistence event subscribers`,
        );
        for (const subscriber of subscribers) {
            for (const fieldToInject of Reflect.getMetadata(
                REQUIRES_FIELD_INJECTION_KEY,
                subscriber,
            ) || []) {
                // Extract type metadata for field injection. This is useful for custom injection in some modules
                const propertyType = Reflect.getMetadata("design:type", subscriber, fieldToInject);
                subscriber[fieldToInject] = iocContainer.get(propertyType);
            }
        }
        logger.info(`${subscribers.length} persistence event subscribers successfully injected`);
    }

    static async runMigration(logger: Logger, dataSource: DataSource) {
        logger.info("Running migrations");
        try {
            const migrations = await dataSource.runMigrations();
            logger.info(`${migrations.length} migration was successfully executed`);
        } catch (error) {
            logger.info(`Migrations failed due to:`, error);
        }
    }

    static bindDataRepositories(logger: Logger) {
        const context = ApplicationContext.get();
        if (context.diOptions) {
            logger.info(`Binding persistence repositories`);
            context.repositoriesAdapter?.bind(context.diOptions.iocContainer);
        } else {
            throw new Error("diOptions with an IOC Container is required for Data Repositories");
        }
    }

    static async runDatabaseSync(logger: Logger, dataSource: DataSource) {
        logger.info(`Starting database synchronization`);
        try {
            await dataSource.synchronize();
            logger.info(`Database synchronization was successful`);
        } catch (error) {
            logger.error(`Error running database synchronization:`, error);
        }
    }

    static async ensureDatabase(logger: Logger, dataSource: DataSource) {
        const queryRunner = dataSource.createQueryRunner();

        try {
            const tables = await queryRunner.getTables();
            const entities = dataSource.entityMetadatas;
            logger.info(
                `Database validation: Running consistency validation for ${tables.length}-tables/${entities.length}-entities.`,
            );

            const existingEntities = entities.filter(
                entity => tables.find(table => table.name.includes(entity.tableName)) !== undefined,
            );

            if (existingEntities.length !== entities.length) {
                logger.error(
                    `Inconsistent persistence layer: There are ${entities.length} entities registered but ${existingEntities.length} are in the database.`,
                );
                logger.warn(`Please enable database sync through "node-boot.persistence.synchronize: true" 
                or activate migrations through "node-boot.persistence.migrationsRun: true" to properly setup the database. This is important in order to avoid runtime errors in the application`);
                process.exit(1);
            }
            logger.info(`Basic database consistency validation passed`);
        } catch (error) {
            logger.error(`Error validating database:`, error);
            process.exit(1);
        }
    }
}
