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
 * * Initializing the DataSource.
 * * Run migrations if enabled
 * * Run database Sync if enabled
 * * Binding data repositories to the DI container
 * * Validate persistence layer consistency
 *
 *  @author manusant (ney.br.santos@gmail.com)
 * */
@Configuration()
export class PersistenceConfiguration {
    /**
     * The dataSource method  is responsible for configuring and providing the
     * DataSource object for the persistence layer of the application.
     *
     * @param iocContainer (IocContainer): An instance of the IoC container used for dependency injection.
     * @param logger (Logger): An instance of the logger class used for logging messages.
     * @param config (Config): An instance of the configuration class used for retrieving configuration values.
     *
     * @return dataSource (DataSource): The configured and initialized DataSource object for the persistence layer.
     * */
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
                    initializationPromises.push(PersistenceConfiguration.runMigration(logger, dataSource));
                }

                if (synchronizeDatabase) {
                    initializationPromises.push(PersistenceConfiguration.runDatabaseSync(logger, dataSource));
                }

                // Bind Data Repositories if DI container is configured
                PersistenceConfiguration.bindDataRepositories(logger);

                // Validate database consistency
                Promise.all(initializationPromises).then(_ => PersistenceConfiguration.ensureDatabase(logger, dataSource));
            })
            .catch(err => {
                logger.error("Error during Persistence DataSource initialization:", err);
                process.exit(1);
            });
        logger.info("DataSource bean provided successfully");
        return dataSource;
    }

    /**
     * The entityManager method  is responsible for providing an instance of the
     * EntityManager class, which is used for managing database operations.
     *
     * @param iocContainer (IocContainer): An instance of the IoC container used for dependency injection.
     * @param logger (Logger): An instance of the logger class used for logging messages.
     *
     * @return entityManager (EntityManager): The provided instance of the EntityManager class
     * */
    @Bean()
    public entityManager({iocContainer, logger}: BeansContext): EntityManager {
        logger.info("Providing EntityManager");
        const dataSource = iocContainer.get(DataSource);
        logger.info("EntityManager bean provided successfully");
        return dataSource.manager;
    }

    /**
     * The setupInjection method  is responsible for setting up dependency injection
     * for the persistence event subscribers. It retrieves the subscribers from the dataSource object and iterates over
     * each subscriber to inject the required dependencies using the IoC container.
     *
     * @param logger (Logger): An instance of the logger class used for logging messages.
     * @param dataSource (DataSource): An instance of the DataSource class representing the database connection.
     * @param iocContainer (IocContainer<unknown>): An instance of the IoC container used for dependency injection.
     * */
    static setupInjection(logger: Logger, dataSource: DataSource, iocContainer: IocContainer<unknown>) {
        const subscribers = dataSource.subscribers;
        logger.info(`Setting up dependency injection for ${subscribers.length} persistence event subscribers`);
        for (const subscriber of subscribers) {
            for (const fieldToInject of Reflect.getMetadata(REQUIRES_FIELD_INJECTION_KEY, subscriber) || []) {
                // Extract type metadata for field injection. This is useful for custom injection in some modules
                const propertyType = Reflect.getMetadata("design:type", subscriber, fieldToInject);
                subscriber[fieldToInject] = iocContainer.get(propertyType);
            }
        }
        logger.info(`${subscribers.length} persistence event subscribers successfully injected`);
    }

    /**
     * The runMigration method  is responsible for running database migrations
     * using the dataSource object. It logs the success or failure of the migration operation.
     *
     * @param logger (Logger): An instance of the logger class used for logging messages.
     * @param dataSource (DataSource): An instance of the DataSource class representing the database connection.
     * */
    static async runMigration(logger: Logger, dataSource: DataSource) {
        logger.info("Running migrations");
        try {
            const migrations = await dataSource.runMigrations();
            logger.info(`${migrations.length} migration was successfully executed`);
        } catch (error) {
            logger.info(`Migrations failed due to:`, error);
        }
    }

    /**
     * The bindDataRepositories method  is responsible for binding the data
     * repositories to the IoC container. It checks if the diOptions property is defined in the ApplicationContext and
     * then calls the bind method on the repositoriesAdapter using the IoC container.
     *
     * @param logger (Logger): An instance of the logger class used for logging messages
     * */
    static bindDataRepositories(logger: Logger) {
        const context = ApplicationContext.get();
        if (context.diOptions) {
            logger.info(`Binding persistence repositories`);
            context.repositoriesAdapter?.bind(context.diOptions.iocContainer);
        } else {
            throw new Error("diOptions with an IOC Container is required for Data Repositories");
        }
    }

    /**
     * The runDatabaseSync method  is responsible for starting the synchronization
     * of the database. It calls the synchronize method on the DataSource object to perform the synchronization and logs
     * the success or failure of the operation.
     *
     * @param logger (Logger): An instance of the logger class used for logging messages.
     * @param dataSource (DataSource): An instance of the DataSource class representing the database connection.
     * */
    static async runDatabaseSync(logger: Logger, dataSource: DataSource) {
        logger.info(`Starting database synchronization`);
        try {
            await dataSource.synchronize();
            logger.info(`Database synchronization was successful`);
        } catch (error) {
            logger.error(`Error running database synchronization:`, error);
        }
    }

    /**
     * The ensureDatabase method is responsible for validating the consistency of
     * the database by comparing the registered entities with the existing tables in the database.
     *
     * @param logger (Logger): An instance of the logger class used for logging messages.
     * @param dataSource (DataSource): An instance of the DataSource class representing the database connection.
     * */
    static async ensureDatabase(logger: Logger, dataSource: DataSource) {
        const queryRunner = dataSource.createQueryRunner();

        try {
            const tables = await queryRunner.getTables();
            const entities = dataSource.entityMetadatas;
            logger.info(`Database validation: Running consistency validation for ${tables.length}-tables/${entities.length}-entities.`);

            const existingEntities = entities.filter(entity => tables.find(table => table.name.includes(entity.tableName)) !== undefined);

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
