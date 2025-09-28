import {Bean, Configuration} from "@nodeboot/core";
import {DataSource, EntityManager} from "typeorm";
import {ApplicationContext, BeansContext, IocContainer} from "@nodeboot/context";
import {DataSourceOptions} from "typeorm/data-source/DataSourceOptions";
import {PersistenceContext} from "../PersistenceContext";
import {REQUIRES_FIELD_INJECTION_KEY} from "@nodeboot/di";
import {Logger} from "winston";
import {MongoDriver} from "typeorm/driver/mongodb/MongoDriver";
import {MongoClient} from "mongodb";

/**
 * The PersistenceConfiguration class is responsible for configuring the persistence layer of the application.
 * It defines beans for DataSource and EntityManager, manages database initialization,
 * migrations, synchronization, repository bindings, and ensures persistence consistency.
 *
 * Main functionalities include:
 * - Configuring the DataSource bean
 * - Initializing DataSource and running migrations or synchronization if enabled
 * - Injecting dependencies into subscribers and MongoDB client
 * - Binding data repositories to the DI container
 * - Validating the persistence layer consistency
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
@Configuration()
export class PersistenceConfiguration {
    /**
     * Configures and provides the DataSource bean for the persistence layer.
     * Initializes the DataSource, injects dependencies, runs migrations or database synchronization
     * based on configuration, and validates database consistency.
     *
     * @param {BeansContext} context - Context containing iocContainer, logger, and lifecycleBridge.
     * @returns {DataSource} The initialized and configured TypeORM DataSource instance.
     *
     * @throws {Error} If DataSource initialization fails.
     *
     * @author Manuel Santos <https://github.com/manusant>
     */
    @Bean()
    public dataSource({iocContainer, logger, lifecycleBridge}: BeansContext): DataSource {
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

                if (datasourceConfig.type === "mongodb") {
                    PersistenceConfiguration.injectMongoClient(logger, dataSource, iocContainer);
                }

                // Inject dependencies into Subscriber instances
                PersistenceConfiguration.setupInjection(logger, dataSource, iocContainer);

                // Bind Data Repositories if DI container is configured
                PersistenceConfiguration.bindDataRepositories(logger);

                // For SQL like databases
                if (datasourceConfig.type !== "mongodb") {
                    const initializationPromises: Promise<unknown>[] = [];

                    // Run migrations if enabled
                    if (migrationsRun) {
                        initializationPromises.push(PersistenceConfiguration.runMigration(logger, dataSource));
                    }

                    if (synchronizeDatabase) {
                        initializationPromises.push(PersistenceConfiguration.runDatabaseSync(logger, dataSource));
                    }

                    // Validate database consistency
                    Promise.all(initializationPromises).then(_ =>
                        PersistenceConfiguration.ensureDatabase(logger, dataSource),
                    );
                }
            })
            .catch(err => {
                logger.error("Error during Persistence DataSource initialization:", err);
                process.exit(1);
            })
            .finally(() => {
                lifecycleBridge.publish("persistence.started");
            });
        logger.info("DataSource bean provided successfully");
        return dataSource;
    }

    /**
     * Provides an instance of the EntityManager bean for database operations.
     *
     * @param {BeansContext} context - Context containing iocContainer and logger.
     * @returns {EntityManager} The EntityManager instance from the configured DataSource.
     *
     * @author Manuel Santos <https://github.com/manusant>
     */
    @Bean()
    public entityManager({iocContainer, logger}: BeansContext): EntityManager {
        logger.info("Providing EntityManager");
        const dataSource = iocContainer.get(DataSource);
        logger.info("EntityManager bean provided successfully");
        return dataSource.manager;
    }

    /**
     * Sets up dependency injection for persistence event subscribers.
     * Injects required dependencies into subscriber instances based on metadata.
     *
     * @param {Logger} logger - Logger instance for logging messages.
     * @param {DataSource} dataSource - The DataSource containing subscribers.
     * @param {IocContainer<unknown>} iocContainer - The IoC container for resolving dependencies.
     *
     * @author Manuel Santos <https://github.com/manusant>
     */
    static setupInjection(logger: Logger, dataSource: DataSource, iocContainer: IocContainer<unknown>) {
        const subscribers = dataSource.subscribers;
        logger.info(`Setting up dependency injection for ${subscribers.length} persistence event subscribers`);
        for (const subscriber of subscribers) {
            for (const fieldToInject of Reflect.getMetadata(REQUIRES_FIELD_INJECTION_KEY, subscriber) || []) {
                // Extract type metadata for field injection
                const propertyType = Reflect.getMetadata("design:type", subscriber, fieldToInject);
                subscriber[fieldToInject as never] = iocContainer.get(propertyType) as never;
            }
        }
        logger.info(`${subscribers.length} persistence event subscribers successfully injected`);
    }

    /**
     * Injects the MongoDB client into the IoC container.
     * Retrieves MongoClient from the TypeORM MongoDriver and registers it for DI.
     *
     * @param {Logger} logger - Logger instance for logging messages.
     * @param {DataSource} dataSource - TypeORM DataSource instance.
     * @param {IocContainer<unknown>} iocContainer - The IoC container where MongoClient will be registered.
     *
     * @author Manuel Santos <https://github.com/manusant>
     */
    static injectMongoClient(logger: Logger, dataSource: DataSource, iocContainer: IocContainer<unknown>) {
        logger.info(`Setting up injection for MongoClient`);

        const mongoDriver = dataSource.driver;
        if (mongoDriver instanceof MongoDriver) {
            // Force set query runner since TypeORM is not setting it for MongoDB
            (dataSource.manager as any).queryRunner = mongoDriver.queryRunner;

            // Retrieve the MongoClient instance from the MongoDriver's query runner
            const mongoClient = mongoDriver.queryRunner?.databaseConnection;
            if (mongoClient) {
                // Register MongoClient in the IoC container
                iocContainer.set(MongoClient, mongoClient);
                logger.info(
                    `MongoClient was set to the DI container successfully. You can now inject it in your beans`,
                );
            } else {
                logger.warn(`Not able to inject MongoClient. Mongo client not connected`);
            }
        } else {
            logger.error(`Invalid MongoDriver. Please configure mongodb properly`);
        }
    }

    /**
     * Runs database migrations using the provided DataSource.
     * Logs migration success or failure.
     *
     * @param {Logger} logger - Logger instance for logging messages.
     * @param {DataSource} dataSource - The DataSource to run migrations on.
     *
     * @author Manuel Santos <https://github.com/manusant>
     */
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
     * Binds persistence repositories to the IoC container.
     * Throws an error if the DI container is not configured.
     *
     * @param {Logger} logger - Logger instance for logging messages.
     *
     * @throws {Error} When diOptions or IOC container is missing.
     *
     * @author Manuel Santos <https://github.com/manusant>
     */
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
     * Runs database synchronization.
     * Logs success or errors.
     *
     * @param {Logger} logger - Logger instance for logging messages.
     * @param {DataSource} dataSource - The DataSource to synchronize.
     *
     * @author Manuel Santos <https://github.com/manusant>
     */
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
     * Validates database consistency by comparing registered entities with existing tables.
     * Logs inconsistencies and exits process if found.
     *
     * @param {Logger} logger - Logger instance for logging messages.
     * @param {DataSource} dataSource - The DataSource used to create a query runner.
     *
     * @author Manuel Santos <https://github.com/manusant>
     */
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
                logger.warn(`Please enable database sync through "persistence.synchronize: true" 
                or activate migrations through "persistence.migrationsRun: true" to properly setup the database. This is important in order to avoid runtime errors in the application`);
                process.exit(1);
            }
            logger.info(`Basic database consistency validation passed`);
        } catch (error) {
            logger.error(`Error validating database:`, error);
            process.exit(1);
        } finally {
            // Always release the query runner to prevent connection leaks
            await queryRunner.release();
        }
    }
}
