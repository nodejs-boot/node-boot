I want to document the @nodeboot/starter-persistence package focused on database integration for nodeboot applications. It uses typeorm under the hoods but provides auto-configuration and abstractions to provide an injectable Repository pattern to Nodeboot apps.

First, this is the definition of the package:
{
"name": "@nodeboot/starter-persistence",
"version": "1.8.5",
"description": "Nodeboot starter package for persistence. Supports data access layer auto-configuration providing features like database initialization, consistency check, entity mapping, repository pattern, transactions, paging, migrations, persistence listeners, persistence logger, etc",
"author": "Manuel Santos <ney.br.santos@gmail.com>",
"license": "MIT",
"keywords": [
"data",
"persistence",
"database",
"transactions",
"migration",
"repository-pattern",
"mongodb",
"mysql",
"postgresql",
"mariadb",
"sqlite",
"oracle",
"cockroachdb",
"google-spanner",
"ms-sqlserver"
],
"repository": {
"type": "git",
"url": "https://github.com/nodejs-boot/node-boot.git"
},
"publishConfig": {
"access": "public"
},
"main": "dist/index.js",
"types": "dist/index.d.ts",
"scripts": {
"build": "tsc -p tsconfig.build.json",
"clean:build": "rimraf ./dist",
"dev": "nodemon",
"lint": "eslint . --ext .js,.ts",
"lint:fix": "pnpm lint --fix",
"format": "prettier --check .",
"format:fix": "prettier --write .",
"test": "jest",
"typecheck": "tsc"
},
"dependencies": {
"@nodeboot/config": "workspace:_",
"@nodeboot/context": "workspace:_",
"@nodeboot/core": "workspace:_",
"@nodeboot/di": "workspace:_",
"typeorm-transactional": "^0.5.0",
"winston": "^3.10.0",
"reflect-metadata": "^0.2.1"
},
"peerDependencies": {
"typeorm": ">=0.3.20",
"winston": ">=3.10.0"
},
"optionalDependencies": {
"mongodb": "5.9.2"
},
"devDependencies": {
"@types/node": "^22.13.4"
},
"files": [
"dist",
"package.json",
"README.md",
"config.d.ts"
]
}
now lets go to the components that builds this package:

import {RepositoryMetadata} from "./metadata";
import {NamingStrategyInterface} from "typeorm/naming-strategy/NamingStrategyInterface";
import {QueryResultCache} from "typeorm/cache/QueryResultCache";
import {EntitySubscriberInterface, MigrationInterface} from "typeorm";
import {NodeBootDataSourceOptions} from "./property/NodeBootDataSourceOptions";

export class PersistenceContext {
private static context: PersistenceContext;

    repositories: RepositoryMetadata[] = [];
    migrations: (new (...args: any[]) => MigrationInterface)[] = [];
    eventSubscribers: (new (...args: any[]) => EntitySubscriberInterface)[] = [];
    namingStrategy?: new (...args: any[]) => NamingStrategyInterface;
    queryCache?: new (...args: any[]) => QueryResultCache;
    databaseConnectionOverrides?: NodeBootDataSourceOptions;
    synchronizeDatabase?: boolean;
    migrationsRun?: boolean;

    static get(): PersistenceContext {
        if (!PersistenceContext.context) {
            PersistenceContext.context = new PersistenceContext();
        }
        return PersistenceContext.context;
    }

}

import {IocContainer, RepositoriesAdapter} from "@nodeboot/context";
import {EntityManager} from "typeorm";
import {Logger} from "winston";
import {PersistenceContext} from "../PersistenceContext";

export class DefaultRepositoriesAdapter implements RepositoriesAdapter {
bind(iocContainer: IocContainer): void {
const entityManager = iocContainer.get(EntityManager);
const logger = iocContainer.get(Logger);

        for (const repository of PersistenceContext.get().repositories) {
            const {target, entity, type} = repository;

            const entityRepositoryInstance = new (target as any)(entity, entityManager, entityManager.queryRunner);

            logger.info(`Registering a '${type.toString()}' repository '${target.name}' for entity '${entity.name}'`);
            // Set repository to entity manager cache
            (entityManager as any).repositories.set(target, entityRepositoryInstance);
            // set it to the DI container
            iocContainer.set(target, entityRepositoryInstance);
        }
    }

}

import {AbstractLogger, LogLevel, LogMessage} from "typeorm";
import {Logger} from "winston";
import {PersistenceProperties} from "../property/PersistenceProperties";

export class PersistenceLogger extends AbstractLogger {
constructor(private readonly logger: Logger, private readonly configs: PersistenceProperties) {
super();
}

    /**
     * Write log to specific output.
     */
    protected writeLog(level: LogLevel, logMessage: LogMessage | LogMessage[]) {
        const messages = this.prepareLogMessages(logMessage, this.configs.logFormat);

        for (const message of messages) {
            switch (message.type ?? level) {
                case "log":
                case "schema-build":
                case "migration":
                    this.logger.debug(message.message);
                    break;

                case "info":
                case "query":
                    if (message.prefix) {
                        this.logger.info(message.prefix, message.message);
                    } else {
                        this.logger.info(message.message);
                    }
                    break;

                case "warn":
                case "query-slow":
                    if (message.prefix) {
                        this.logger.warn(message.prefix, message.message);
                    } else {
                        this.logger.warn(message.message);
                    }
                    break;

                case "error":
                case "query-error":
                    if (message.prefix) {
                        this.logger.error(message.prefix, message.message);
                    } else {
                        this.logger.error(message.message);
                    }
                    break;
            }
        }
    }

}

import {Bean, Configuration} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import {DataSourceOptions} from "typeorm/data-source/DataSourceOptions";
import {PersistenceContext} from "../PersistenceContext";
import {PersistenceProperties} from "../property/PersistenceProperties";
import {PersistenceLogger} from "../adapter/PersistenceLogger";
import {PERSISTENCE_CONFIG_PATH} from "../types";
import {QUERY_CACHE_CONFIG} from "./QueryCacheConfiguration";

@Configuration()
export class DataSourceConfiguration {
@Bean("datasource-config")
public dataSourceConfig({config, iocContainer, logger}: BeansContext): DataSourceOptions {
const persistenceProperties = config.get<PersistenceProperties>(PERSISTENCE_CONFIG_PATH);
if (!persistenceProperties) {
throw new Error(`'${PERSISTENCE_CONFIG_PATH}' configuration node is required when persistence is enabled. 
            Please add the persistence configuration depending on the data source you are using or remove 
            the @EnableRepositories from your application.`);
}

        const persistenceLogger = new PersistenceLogger(logger, persistenceProperties);
        const {databaseConnectionOverrides, eventSubscribers, migrations, namingStrategy} = PersistenceContext.get();

        const strategy = namingStrategy ? new namingStrategy() : undefined;

        let cacheConfig;
        if (iocContainer.has(QUERY_CACHE_CONFIG)) {
            cacheConfig = iocContainer.get(QUERY_CACHE_CONFIG);
        } else {
            logger.warn("No query cache configuration found while building datasource configuration");
        }

        let databaseConfigs = persistenceProperties[persistenceProperties.type];
        if (!databaseConfigs) {
            throw new Error(
                `Invalid persistence configuration. No database specific configuration found for ${persistenceProperties.type} database under ${PERSISTENCE_CONFIG_PATH}' configuration node.`,
            );
        }
        // Set the type from configurations to the driver/connection type
        databaseConfigs.type = persistenceProperties.type;

        logger.info(`${eventSubscribers.length} subscribers found and ready to be registered`);
        logger.info(`${migrations.length} migrations found and ready to be registered`);

        if (databaseConnectionOverrides) {
            if (databaseConnectionOverrides.type !== persistenceProperties.type) {
                throw new Error(`Database type mismatch between configuration properties (${persistenceProperties.type})
                and @DatasourceConfiguration(...) (${databaseConnectionOverrides.type})`);
            }

            databaseConfigs = {
                ...databaseConfigs,
                ...(databaseConnectionOverrides as any),
            };
        }

        if (databaseConfigs.synchronize && databaseConfigs.migrationsRun) {
            throw new Error(
                `Only one of "synchronize" or "migrationsRun" config property can be enabled. Please set one of them to false`,
            );
        }

        // Save the synchronization and migration state
        PersistenceContext.get().synchronizeDatabase = databaseConfigs.synchronize;
        PersistenceContext.get().migrationsRun = databaseConfigs.migrationsRun;

        return {
            ...databaseConfigs,
            namingStrategy: strategy,
            subscribers: eventSubscribers,
            migrations: migrations,
            logger: persistenceLogger,
            cache: cacheConfig,
            // IMPORTANT: Disable synchronization and migrations run during datasource initialization. If enabled it will be synced afterward
            // If enabled here it will cause injection issues
            synchronize: false,
            migrationsRun: false,
        };
    }

}

import {Bean, Configuration} from "@nodeboot/core";
import {DataSource, EntityManager} from "typeorm";
import {ApplicationContext, BeansContext, IocContainer} from "@nodeboot/context";
import {DataSourceOptions} from "typeorm/data-source/DataSourceOptions";
import {PersistenceContext} from "../PersistenceContext";
import {REQUIRES_FIELD_INJECTION_KEY} from "@nodeboot/di";
import {Logger} from "winston";
import {MongoDriver} from "typeorm/driver/mongodb/MongoDriver";
import {MongoClient} from "mongodb";

/\*\*

-   The PersistenceConfiguration class is responsible for configuring the persistence layer of the application.
-   It defines two beans: dataSource and entityManager, which are used to manage the database connection and perform database operations.
-
-   <i>Main functionalities</i>:
-   -   Configuring the DataSource bean for the persistence layer.
-   -   Initializing the DataSource.
-   -   Run migrations if enabled
-   -   Run database Sync if enabled
-   -   Binding data repositories to the DI container
-   -   Validate persistence layer consistency
-
-   @author manusant (ney.br.santos@gmail.com)
-   \*/
    @Configuration()
    export class PersistenceConfiguration {
    /\*\*

    -   The dataSource method is responsible for configuring and providing the
    -   DataSource object for the persistence layer of the application.
    -
    -   @param iocContainer (IocContainer): An instance of the IoC container used for dependency injection.
    -   @param logger (Logger): An instance of the logger class used for logging messages.
    -   @param config (Config): An instance of the configuration class used for retrieving configuration values.
    -
    -   @return dataSource (DataSource): The configured and initialized DataSource object for the persistence layer.
    -   \*/
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

    /\*\*

    -   The entityManager method is responsible for providing an instance of the
    -   EntityManager class, which is used for managing database operations.
    -
    -   @param iocContainer (IocContainer): An instance of the IoC container used for dependency injection.
    -   @param logger (Logger): An instance of the logger class used for logging messages.
    -
    -   @return entityManager (EntityManager): The provided instance of the EntityManager class
    -   \*/
        @Bean()
        public entityManager({iocContainer, logger}: BeansContext): EntityManager {
        logger.info("Providing EntityManager");
        const dataSource = iocContainer.get(DataSource);
        logger.info("EntityManager bean provided successfully");
        return dataSource.manager;
        }

    /\*\*

    -   The setupInjection method is responsible for setting up dependency injection
    -   for the persistence event subscribers. It retrieves the subscribers from the dataSource object and iterates over
    -   each subscriber to inject the required dependencies using the IoC container.
    -
    -   @param logger (Logger): An instance of the logger class used for logging messages.
    -   @param dataSource (DataSource): An instance of the DataSource class representing the database connection.
    -   @param iocContainer (IocContainer<unknown>): An instance of the IoC container used for dependency injection.
    -   \*/
        static setupInjection(logger: Logger, dataSource: DataSource, iocContainer: IocContainer<unknown>) {
        const subscribers = dataSource.subscribers;
        logger.info(`Setting up dependency injection for ${subscribers.length} persistence event subscribers`);
        for (const subscriber of subscribers) {
        for (const fieldToInject of Reflect.getMetadata(REQUIRES_FIELD_INJECTION_KEY, subscriber) || []) {
        // Extract type metadata for field injection. This is useful for custom injection in some modules
        const propertyType = Reflect.getMetadata("design:type", subscriber, fieldToInject);
        subscriber[fieldToInject as never] = iocContainer.get(propertyType) as never;
        }
        }
        logger.info(`${subscribers.length} persistence event subscribers successfully injected`);
        }

    /\*\*

    -   Injects the MongoDB client into the dependency injection (DI) container.
    -
    -   This method retrieves the MongoClient instance from the provided TypeORM DataSource
    -   and registers it in the given IoC container. This allows the MongoClient to be injected
    -   into other services or beans within the application.
    -
    -   @param {Logger} logger - The logger instance to log messages.
    -   @param {DataSource} dataSource - The TypeORM DataSource instance used to retrieve the MongoDB client.
    -   @param {IocContainer<unknown>} iocContainer - The IoC container where the MongoClient will be registered.
        \*/
        static injectMongoClient(logger: Logger, dataSource: DataSource, iocContainer: IocContainer<unknown>) {
        logger.info(`Setting up injection for MongoClient`);

        const mongoDriver = dataSource.driver;
        if (mongoDriver instanceof MongoDriver) {
        // IMPORTANT: Force Set query runner since TypeORM is not setting it for mongoDB
        (dataSource.manager as any).queryRunner = mongoDriver.queryRunner;

             // Retrieve the MongoClient instance from the TypeORM MongoDriver
             const mongoClient = mongoDriver.queryRunner?.databaseConnection;
             if (mongoClient) {
                 // Register the MongoClient in the IoC container
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

    /\*\*

    -   The runMigration method is responsible for running database migrations
    -   using the dataSource object. It logs the success or failure of the migration operation.
    -
    -   @param logger (Logger): An instance of the logger class used for logging messages.
    -   @param dataSource (DataSource): An instance of the DataSource class representing the database connection.
    -   \*/
        static async runMigration(logger: Logger, dataSource: DataSource) {
        logger.info("Running migrations");
        try {
        const migrations = await dataSource.runMigrations();
        logger.info(`${migrations.length} migration was successfully executed`);
        } catch (error) {
        logger.info(`Migrations failed due to:`, error);
        }
        }

    /\*\*

    -   The bindDataRepositories method is responsible for binding the data
    -   repositories to the IoC container. It checks if the diOptions property is defined in the ApplicationContext and
    -   then calls the bind method on the repositoriesAdapter using the IoC container.
    -
    -   @param logger (Logger): An instance of the logger class used for logging messages
    -   \*/
        static bindDataRepositories(logger: Logger) {
        const context = ApplicationContext.get();
        if (context.diOptions) {
        logger.info(`Binding persistence repositories`);
        context.repositoriesAdapter?.bind(context.diOptions.iocContainer);
        } else {
        throw new Error("diOptions with an IOC Container is required for Data Repositories");
        }
        }

    /\*\*

    -   The runDatabaseSync method is responsible for starting the synchronization
    -   of the database. It calls the synchronize method on the DataSource object to perform the synchronization and logs
    -   the success or failure of the operation.
    -
    -   @param logger (Logger): An instance of the logger class used for logging messages.
    -   @param dataSource (DataSource): An instance of the DataSource class representing the database connection.
    -   \*/
        static async runDatabaseSync(logger: Logger, dataSource: DataSource) {
        logger.info(`Starting database synchronization`);
        try {
        await dataSource.synchronize();
        logger.info(`Database synchronization was successful`);
        } catch (error) {
        logger.error(`Error running database synchronization:`, error);
        }
        }

    /\*\*

    -   The ensureDatabase method is responsible for validating the consistency of
    -   the database by comparing the registered entities with the existing tables in the database.
    -
    -   @param logger (Logger): An instance of the logger class used for logging messages.
    -   @param dataSource (DataSource): An instance of the DataSource class representing the database connection.
    -   \*/
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
        }
        }
        }

import {Bean, Configuration} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import {DataSource} from "typeorm";
import {QueryResultCache} from "typeorm/cache/QueryResultCache";
import {QueryCacheProperties} from "../property/QueryCacheProperties";
import {PersistenceContext} from "../PersistenceContext";
import {PERSISTENCE_CONFIG_PATH} from "../types";

export const QUERY_CACHE_CONFIG = "query-cache-config";

export type QueryCacheConfig =
| boolean
| (QueryCacheProperties & {
/\*\*

-   Factory function for custom cache providers that implement QueryResultCache.
    \*/
    provider?: (connection: DataSource) => QueryResultCache;
    });

@Configuration()
export class QueryCacheConfiguration {
@Bean()
public queryCacheConfig({iocContainer, logger, config}: BeansContext) {
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

Decorators:
import {PersistenceContext} from "../PersistenceContext";
import {RepositoryType} from "../types";

function getRepositoryType(prototype: any): RepositoryType | undefined {
while (prototype) {
if (prototype.constructor.name === "Repository") {
return RepositoryType.SQL;
}
if (prototype.constructor.name === "MongoRepository") {
return RepositoryType.MONGO;
}
if (prototype.constructor.name === "TreeRepository") {
return RepositoryType.TREE;
}
prototype = Object.getPrototypeOf(prototype);
}
return undefined;
}

export const DataRepository = (entity: Function): ClassDecorator => {
return (target: Function) => {
const repoType = getRepositoryType(target.prototype);
if (!repoType) {
throw new Error(
`Invalid repository type for repository ${target.prototype.name}. Please extend from Repository, MongoRepository or TreeRepository`,
);
}

        Reflect.defineMetadata("custom:repotype", repoType, target.prototype);
        Reflect.defineMetadata("__isRepository", true, target);

        PersistenceContext.get().repositories.push({
            target,
            entity,
            type: repoType,
        });
    };

};
import {PersistenceContext} from "../PersistenceContext";
import {NodeBootDataSourceOptions} from "../property/NodeBootDataSourceOptions";

export function DatasourceConfiguration(options: NodeBootDataSourceOptions): ClassDecorator {
return () => {
PersistenceContext.get().databaseConnectionOverrides = options;
};
}

import {ApplicationContext} from "@nodeboot/context";
import {DefaultRepositoriesAdapter} from "../adapter";
import {DataSourceConfiguration, PersistenceConfiguration} from "../config";
import {TransactionConfiguration} from "../config/TransactionConfiguration";
import {QueryCacheConfiguration} from "../config/QueryCacheConfiguration";

export const EnableRepositories = (): ClassDecorator => {
return () => {
ApplicationContext.get().applicationFeatures["persistence"] = true;

        // Register repositories adapter
        ApplicationContext.get().repositoriesAdapter = new DefaultRepositoriesAdapter();

        // Resolve query cache configurations
        new QueryCacheConfiguration();

        // Resolve data source configurations from configuration properties
        new DataSourceConfiguration();

        // Trigger persistence configuration
        new PersistenceConfiguration();

        // Trigger Transactions configuration
        new TransactionConfiguration();
    };

};

import {EntitySubscriberInterface, EventSubscriber} from "typeorm";
import {PersistenceContext} from "../PersistenceContext";

export function EntityEventSubscriber<T extends new (...args: any[]) => EntitySubscriberInterface>() {
return (target: T) => {
EventSubscriber()(target);
PersistenceContext.get().eventSubscribers.push(target);
};
}

import {PersistenceContext} from "../PersistenceContext";
import {MigrationInterface} from "typeorm";

export function Migration<T extends new (...args: any[]) => MigrationInterface>() {
return (target: T) => {
PersistenceContext.get().migrations.push(target);
};
}

import {PersistenceContext} from "../PersistenceContext";
import {QueryResultCache} from "typeorm/cache/QueryResultCache";
import {decorateDi} from "@nodeboot/di";

export function PersistenceCache<T extends new (...args: any[]) => QueryResultCache>() {
return (target: T) => {
// Inject dependencies if DI container is configured
decorateDi(target);
PersistenceContext.get().queryCache = target;
};
}

import {NamingStrategyInterface} from "typeorm/naming-strategy/NamingStrategyInterface";
import {PersistenceContext} from "../PersistenceContext";

export function PersistenceNamingStrategy<T extends new (...args: any[]) => NamingStrategyInterface>() {
return (target: T) => {
PersistenceContext.get().namingStrategy = target;
};
}

import {Transactional as InnerTransactional, WrapInTransactionOptions} from "typeorm-transactional";

/\*\*

-   The Transactional function is a decorator that can be applied to methods in TypeScript classes. It wraps the decorated
-   method in a transaction, providing transactional behavior for the method's execution.
-
-   The decorated method is wrapped in a transaction, allowing it to be executed within a transactional context.
-
-   @example
-   ```ts

    ```

-   class UserService {
-   @Transactional()
-   async createUser(name: string): Promise<User> {
-               // Method implementation
-   }
-   }
-   ```

    ```

-
-   @param options (optional) - An object that can contain the following properties:
-                connectionName: The name of the data source connection to use for the transaction.
-                propagation: The propagation behavior of the transaction.
-                isolationLevel: The isolation level of the transaction.
-                name: The name or symbol of the method being decorated.
-   \*/
    export const Transactional = (options?: WrapInTransactionOptions): MethodDecorator => {
    return (target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>) => {
    InnerTransactional(options)(target, propertyKey, descriptor);
    };
    };

Persistence hooks:
mondoDB
import {MongoEntityManager, ObjectLiteral} from "typeorm";
import {MongoQueryRunner} from "typeorm/driver/mongodb/MongoQueryRunner";
import {Repository} from "typeorm/repository/Repository";
import {RepositoryType} from "../types";

/\*\*

-   Retrieves the MongoDB client associated with a given TypeORM MongoRepository instance.
-
-   @param repoInstance - An instance of a MongoRepository.
-   @returns The MongoClient instance used by the repository.
-   @throws Error if the function is called outside of a MongoRepository.
    \*/
    export function useMongoClient(repoInstance: Repository<any>) {
    const queryRunner = repoInstance.queryRunner;
    const type = Reflect.getMetadata("custom:repotype", repoInstance);
    if (type === RepositoryType.MONGO && queryRunner) {
    // Retrieve the MongoClient instance from the TypeORM MongoDriver
    const mongoClient = (queryRunner as MongoQueryRunner).databaseConnection;
    if (mongoClient) {
    return mongoClient;
    }
    }
    throw new Error(`useMongoClient hook can only be used inside repositories extending MongoRepository`);
    }

/\*\*

-   Retrieves a MongoDB collection associated with a given TypeORM MongoRepository instance.
-
-   @template C - The entity class type.
-   @param repoInstance - An instance of a MongoRepository.
-   @param collectionName - (Optional) The name of the collection to retrieve.
-   @returns The requested MongoDB Collection.
-   @throws Error if the function is called outside of a MongoRepository or if the collection cannot be determined.
    \*/
    export function useMongoCollection<C extends ObjectLiteral>(repoInstance: Repository<any>, collectionName?: string) {
    // Check if the repository is an instance of MongoRepository
    const type = Reflect.getMetadata("custom:repotype", repoInstance);

    if (type === RepositoryType.MONGO && repoInstance.queryRunner) {
    // Get the database instance
    const mongoDatabase = (repoInstance.queryRunner as MongoQueryRunner).databaseConnection?.db();
    if (mongoDatabase) {
    return mongoDatabase.collection<C>(collectionName ?? repoInstance.metadata.tableName);
    }
    }
    throw new Error(`useMongoCollection function can only be used with instances of MongoRepository.`);
    }

/\*\*

-   Retrieves the Mongo EntityManager associated with a given TypeORM MongoRepository instance.
-
-   @param repoInstance - An instance of a TypeORM MongoRepository.
-   @returns The EntityManager associated with the MongoRepository.
-   @throws Error if the repository instance is invalid.
    \*/
    export function useMongoEntityManager(repoInstance: Repository<any>): MongoEntityManager {
    const type = Reflect.getMetadata("custom:repotype", repoInstance);
    if (type !== RepositoryType.MONGO) {
    throw new Error(`useMongoEntityManager hook can only be used inside a valid TypeORM MongoRepository`);
    }
    return repoInstance.manager as MongoEntityManager;
    }

/\*\*

-   Retrieves the MongoQueryRunner associated with a MongoDB repository.
-
-   @param repoInstance - An instance of a TypeORM MongoRepository.
-   @returns The MongoQueryRunner associated with the repository.
-   @throws Error if the repository is not using a MongoQueryRunner.
    \*/
    export function useMongoQueryRunner(repoInstance: Repository<any>): MongoQueryRunner {
    const type = Reflect.getMetadata("custom:repotype", repoInstance);
    if (type !== RepositoryType.MONGO) {
    throw new Error(
    `useMongoQueryRunner hook can only be used inside MongoDB repositories with an active MongoQueryRunner`,
    );
    }
    return repoInstance.queryRunner as MongoQueryRunner;
    }
    SQL
    import {EntityManager, QueryRunner, Repository} from "typeorm";

/\*\*

-   Retrieves the EntityManager associated with a given TypeORM repository instance.
-
-   @template R - A repository extending Repository or any other TypeORM repository.
-   @param repoInstance - An instance of a TypeORM Repository.
-   @returns The EntityManager associated with the repository.
-   @throws Error if the repository instance is invalid.
    \*/
    export function useEntityManager<R extends Repository<any>>(repoInstance: R): EntityManager {
    if (!repoInstance.manager) {
    throw new Error(`useEntityManager hook can only be used inside a valid TypeORM repository`);
    }
    return repoInstance.manager;
    }

/\*\*

-   Retrieves the QueryRunner associated with a given TypeORM repository.
-
-   @template R - A repository extending TypeORM's Repository.
-   @param repoInstance - An instance of a TypeORM Repository.
-   @returns The QueryRunner associated with the repository.
-   @throws Error if the repository does not have a valid QueryRunner.
    \*/
    export function useQueryRunner<R extends Repository<any>>(repoInstance: R): QueryRunner {
    if (!repoInstance.queryRunner) {
    throw new Error(`useQueryRunner hook can only be used inside repositories with an active QueryRunner`);
    }
    return repoInstance.queryRunner;
    }

Transaction hooks:
import {
runOnTransactionCommit as innerRunOnTransactionCommit,
runOnTransactionComplete as innerRunOnTransactionComplete,
runOnTransactionRollback as innerRunOnTransactionRollback,
wrapInTransaction,
WrapInTransactionOptions,
} from "typeorm-transactional";

/\*\*

-   Registers a callback to be executed when the current transaction is successfully committed.
-
-   @param cb - The callback function to execute on transaction commit.
    \*/
    export const runOnTransactionCommit = (cb: () => void) => {
    return innerRunOnTransactionCommit(cb);
    };

/\*\*

-   Registers a callback to be executed when the current transaction is rolled back.
-
-   @param cb - The callback function that receives the error that caused the rollback.
    \*/
    export const runOnTransactionRollback = (cb: (e: Error) => void) => {
    return innerRunOnTransactionRollback(cb);
    };

/\*\*

-   Registers a callback to be executed when the current transaction is either committed or rolled back.
-
-   @param cb - The callback function that receives an optional error (if the transaction was rolled back).
    \*/
    export const runOnTransactionComplete = (cb: (e: Error | undefined) => void) => {
    return innerRunOnTransactionComplete(cb);
    };

/\*\*

-   Executes a given function within a transaction.
-
-   @template F - The function type to be executed inside the transaction.
-   @param fn - The function to be executed within the transaction.
-   @param options - Optional transaction options (e.g., isolation level, propagation).
-   @returns The result of the function execution within the transaction.
    \*/
    export const runInTransaction = <F extends (this: unknown) => ReturnType<F>>(
    fn: F,
    options?: WrapInTransactionOptions,
    ) => {
    return wrapInTransaction(fn, options)();
    };

Metadata:
import {
runOnTransactionCommit as innerRunOnTransactionCommit,
runOnTransactionComplete as innerRunOnTransactionComplete,
runOnTransactionRollback as innerRunOnTransactionRollback,
wrapInTransaction,
WrapInTransactionOptions,
} from "typeorm-transactional";

/\*\*

-   Registers a callback to be executed when the current transaction is successfully committed.
-
-   @param cb - The callback function to execute on transaction commit.
    \*/
    export const runOnTransactionCommit = (cb: () => void) => {
    return innerRunOnTransactionCommit(cb);
    };

/\*\*

-   Registers a callback to be executed when the current transaction is rolled back.
-
-   @param cb - The callback function that receives the error that caused the rollback.
    \*/
    export const runOnTransactionRollback = (cb: (e: Error) => void) => {
    return innerRunOnTransactionRollback(cb);
    };

/\*\*

-   Registers a callback to be executed when the current transaction is either committed or rolled back.
-
-   @param cb - The callback function that receives an optional error (if the transaction was rolled back).
    \*/
    export const runOnTransactionComplete = (cb: (e: Error | undefined) => void) => {
    return innerRunOnTransactionComplete(cb);
    };

/\*\*

-   Executes a given function within a transaction.
-
-   @template F - The function type to be executed inside the transaction.
-   @param fn - The function to be executed within the transaction.
-   @param options - Optional transaction options (e.g., isolation level, propagation).
-   @returns The result of the function execution within the transaction.
    \*/
    export const runInTransaction = <F extends (this: unknown) => ReturnType<F>>(
    fn: F,
    options?: WrapInTransactionOptions,
    ) => {
    return wrapInTransaction(fn, options)();
    };

Apart from TypeORM repository interfaces:
import {FindOptionsWhere, MongoRepository, ObjectLiteral} from "typeorm";
import {CursorPage, CursorRequest, Page, PagingRequest, SortOrder} from "@nodeboot/core";

/\*\*

-   A generic MongoDB repository that provides both offset-based and cursor-based pagination.
-   This can be extended by application repositories to support pagination out of the box.
-
-   @template Entity - The database entity type (e.g., User, Product, Post)
-   @author Manuel Santos <ney.br.santos@gmail.com>
    \*/
    export class MongoPagingAndSortingRepository<Entity extends ObjectLiteral> extends MongoRepository<Entity> {
    /\*\*

    -   Offset-based pagination (Traditional Pagination)
    -
    -   This method retrieves paginated results using `LIMIT` and `SKIP`.
    -   It is useful when you need **random access to pages** (e.g., "Jump to page 3").
    -
    -   However, for large datasets, this method can be **inefficient** because SKIP requires scanning records before fetching.
    -
    -   @param filter - MongoDB-like filter object `{ field: value }`
    -   @param options - Pagination options containing:
    -   -   page - The page number (starting from 1, default: 1)
    -   -   pageSize - Number of items per page (default: 10)
    -   -   sortField - The field used for sorting (default: `_id`)
    -   -   sortOrder - The sort direction (`ASC` for ascending, `DESC` for descending, default: `DESC`)
    -
    -   @returns An object containing:
    -   -   `page`: Current page number
    -   -   `pageSize`: Number of records per page
    -   -   `totalItems`: Total number of records
    -   -   `totalPages`: Total pages based on total items
    -   -   `items`: Array of paginated records
            \*/
            async findPaginated(filter: FindOptionsWhere<Entity> = {}, options: PagingRequest): Promise<Page<Entity>> {
            const {page = 1, pageSize = 10, sortField = "\_id" as keyof Entity, sortOrder = SortOrder.DESC} = options;

    // Ensure valid page and pageSize
    const validPage = Math.max(1, page);
    const validPageSize = Math.max(1, pageSize);

    // Calculate number of records to skip
    const skip = (validPage - 1) \* validPageSize;

    // Fetch paginated data and count total items
    const [items, totalItems] = await Promise.all([
    this.find({
    where: filter,
    order: {[sortField]: sortOrder === SortOrder.ASC ? 1 : -1},
    skip,
    take: validPageSize,
    }),
    this.count(filter),
    ]);

    return {
    page: validPage,
    pageSize: validPageSize,
    totalItems,
    items,
    totalPages: Math.ceil(totalItems / pageSize),
    };
    }

    /\*\*

    -   Cursor-based pagination (Efficient Pagination)
    -
    -   Instead of using SKIP, this method uses a **cursor** (`_id` or another indexed field) to fetch the next page.
    -   This is **more efficient for large datasets** because it avoids skipping records.
    -
    -   This method is ideal for **infinite scrolling** or **continuous data loading** (e.g., social media feeds).
    -
    -   @param filter - MongoDB-like filter object `{ field: value }`
    -   @param options - Pagination options containing:
    -   -   pageSize - Number of items per page (default: 10)
    -   -   lastId - The `_id` of the last item from the previous page (optional)
    -   -   sortField - The field used for sorting (default: `_id`)
    -   -   sortOrder - The sort direction (`ASC` for ascending, `DESC` for descending, default: `ASC`)
    -
    -   @returns An object containing:
    -   -   `pageSize`: Number of records per page
    -   -   `lastId`: The `_id` of the last record from the current page (used as a cursor for the next page)
    -   -   `items`: Array of paginated records
            \*/
            async findCursorPaginated(
            filter: FindOptionsWhere<Entity> = {},
            options: CursorRequest,
            ): Promise<CursorPage<Entity>> {
            const {pageSize = 10, lastId, sortField = "\_id" as keyof Entity, sortOrder = SortOrder.ASC} = options;

    const query: FindOptionsWhere<Entity> = {...filter};

    // Add cursor condition (\_id > lastId for forward pagination)
    if (lastId) {
    (query as any).\_id =
    sortOrder === SortOrder.ASC
    ? {$gt: lastId} // Next page (ascending)
    : {$lt: lastId}; // Previous page (descending)
    }

    // Fetch paginated data
    const items = await this.find({
    where: query,
    order: {[sortField]: sortOrder === SortOrder.ASC ? 1 : -1},
    take: pageSize,
    });

    // Get the last \_id from the current page
    const newLastId: string = items.length > 0 ? items[items.length - 1]?.["_id"].toString() : null;

    return {
    pageSize,
    items,
    lastId: newLastId,
    };
    }
    }

import {FindOptionsOrder, FindOptionsWhere, LessThan, MoreThan, ObjectLiteral, Repository} from "typeorm";
import {CursorPage, CursorRequest, Page, PagingRequest, SortOrder} from "@nodeboot/core";

/\*\*

-   A generic repository that provides both offset-based and cursor-based pagination.
-   This can be extended by application repositories to support pagination out of the box.
-
-   @template Entity - The database entity type (e.g., User, Post, Product)
-   @author Manuel Santos <ney.br.santos@gmail.com>
    \*/
    export class PagingAndSortingRepository<Entity extends ObjectLiteral> extends Repository<Entity> {
    /\*\*

    -   Offset-based pagination (Traditional Pagination)
    -
    -   This method retrieves paginated results using `LIMIT` and `OFFSET`.
    -   It is useful when you need **random access to pages** (e.g., "Jump to page 3").
    -
    -   However, for large datasets, this method can be **inefficient** because OFFSET skips records before fetching.
    -
    -   @param filter - TypeORM filter object `{ field: value }`
    -   @param options - Pagination options containing:
    -   -   page - The page number (starting from 1, default: 1)
    -   -   pageSize - Number of items per page (default: 10)
    -   -   sortField - The field used for sorting (default: `id`)
    -   -   sortOrder - The sort direction (`"ASC"` or `"DESC"`, default: `"DESC"`)
    -
    -   @returns An object containing:
    -   -   `page`: Current page number
    -   -   `pageSize`: Number of records per page
    -   -   `totalItems`: Total number of records
    -   -   `totalPages`: Total pages based on total items
    -   -   `items`: Array of paginated records
            \*/
            async findPaginated(filter: FindOptionsWhere<Entity> = {}, options: PagingRequest): Promise<Page<Entity>> {
            const {page = 1, pageSize = 10, sortField = "id" as keyof Entity, sortOrder = SortOrder.DESC} = options;

    // Ensure valid page and pageSize
    const validPage = Math.max(1, page);
    const validPageSize = Math.max(1, pageSize);

    // Calculate number of records to skip
    const skip = (validPage - 1) \* validPageSize;

    // Ensure TypeORM recognizes the sorting order
    const order = {[sortField]: sortOrder} as FindOptionsOrder<Entity>;

    // Fetch paginated data and count total items
    const [items, totalItems] = await this.findAndCount({
    where: filter,
    order: order,
    skip,
    take: validPageSize,
    });

    return {
    totalItems,
    items,
    pageSize: validPageSize,
    page: validPage,
    totalPages: Math.ceil(totalItems / pageSize),
    };
    }

    /\*\*

    -   Cursor-based pagination (Efficient Pagination)
    -
    -   Instead of using OFFSET, this method uses a **cursor** (e.g., an `id` or `createdAt` value) to fetch the next page.
    -   This is **more efficient for large datasets** because it avoids skipping records.
    -
    -   This method is ideal for **infinite scrolling** or **continuous data loading** (e.g., social media feeds).
    -
    -   @param filter - TypeORM filter object `{ field: value }`
    -   @param options - Pagination Options containing:
    -   -   pageSize - Number of items per page (default: 10)
    -   -   cursor - The last seen value of the `sortField` from the previous page (optional)
    -   -   sortField - The field used for sorting (default: `createdAt`)
    -   -   sortOrder - The sort direction (`"ASC"` or `"DESC"`, default: `"DESC"`)
    -
    -   @returns An object containing:
    -   -   `pageSize`: Number of records per page
    -   -   `cursor`: The last value of `sortField` from the current page (to fetch the next page)
    -   -   `items`: Array of paginated records
            \*/
            async findCursorPaginated(
            filter: FindOptionsWhere<Entity> = {},
            options: CursorRequest,
            ): Promise<CursorPage<Entity>> {
            const {pageSize = 10, cursor, sortField = "createdAt" as keyof Entity, sortOrder = "DESC"} = options;

    // Clone filter object to avoid modifying the original
    const queryFilter: FindOptionsWhere<Entity> = {...filter};

    // Apply cursor condition if provided
    if (cursor) {
    (queryFilter as any)[sortField] = sortOrder === "ASC" ? MoreThan(cursor) : LessThan(cursor);
    }

    // Ensure TypeORM recognizes the sorting order
    const order = {[sortField]: sortOrder} as FindOptionsOrder<Entity>;

    // Fetch paginated data
    const items = await this.find({
    where: queryFilter,
    order: order,
    take: pageSize,
    });

    return {
    pageSize,
    items,
    cursor: items.length > 0 ? items[items.length - 1]?.[sortField].toString() : null,
    };
    }
    }

Configuration properties:
import {AuroraMysqlConnectionCredentialsOptions} from "typeorm/driver/aurora-mysql/AuroraMysqlConnectionCredentialsOptions";

/\*\*

-   MySQL specific connection options.
-
-   @see https://github.com/mysqljs/mysql#connection-options
    \*/
    export interface AuroraMysqlConnectionProperties extends AuroraMysqlConnectionCredentialsOptions {
    readonly region: string;

    readonly secretArn: string;

    readonly resourceArn: string;

    readonly database: string;
    /\*\*

    -   Use spatial functions like GeomFromText and AsText which are removed in MySQL 8.
    -   (Default: true)
        \*/
        readonly legacySpatialSupport?: boolean;

    readonly poolSize?: never;
    }

/\*\*

-   Postgres-specific connection options.
    \*/
    export interface AuroraPostgresConnectionProperties {
    readonly region: string;

    readonly secretArn: string;

    readonly resourceArn: string;

    readonly database: string;

    /\*\*

    -   The Postgres extension to use to generate UUID columns. Defaults to uuid-ossp.
    -   If pgcrypto is selected, TypeORM will use the gen_random_uuid() function from this extension.
    -   If uuid-ossp is selected, TypeORM will use the uuid_generate_v4() function from this extension.
        \*/
        readonly uuidExtension?: "pgcrypto" | "uuid-ossp";

    readonly transformParameters?: boolean;

    readonly poolSize?: never;
    }

/\*\*

-   Sqlite-specific connection options.
    \*/
    export interface BetterSqlite3ConnectionProperties {
    /\*\*

    -   Storage type or path to the storage.
        \*/
        readonly database: string;

    /\*\*

    -   The driver object
    -   This defaults to require("better-sqlite3")
        \*/
        readonly driver?: any;

    /\*\*

    -   Encryption key for for SQLCipher.
        \*/
        readonly key?: string;

    /\*\*

    -   Cache size of sqlite statement to speed up queries.
    -   Default: 100.
        \*/
        readonly statementCacheSize?: number;

    /\*\*

    -   Open the database connection in readonly mode.
    -   Default: false.
        \*/
        readonly readonly?: boolean;

    /\*\*

    -   If the database does not exist, an Error will be thrown instead of creating a new file.
    -   This option does not affect in-memory or readonly database connections.
    -   Default: false.
        \*/
        readonly fileMustExist?: boolean;

    /\*\*

    -   The number of milliseconds to wait when executing queries
    -   on a locked database, before throwing a SQLITE_BUSY error.
    -   Default: 5000.
        \*/
        readonly timeout?: number;

    /\*\*

    -   Relative or absolute path to the native addon (better_sqlite3.node).
        \*/
        readonly nativeBinding?: string;

    readonly poolSize?: never;

    /\*\*

    -   Enables WAL mode. By default its disabled.
    -
    -   @see https://www.sqlite.org/wal.html
        \*/
        readonly enableWAL?: boolean;
        }

import {CockroachConnectionCredentialsOptions} from "typeorm/driver/cockroachdb/CockroachConnectionCredentialsOptions";

/\*\*

-   Cockroachdb-specific connection options.
    \*/
    export interface CockroachConnectionProperties extends CockroachConnectionCredentialsOptions {
    /\*\*

    -   Enable time travel queries on cockroachdb.
    -   https://www.cockroachlabs.com/docs/stable/as-of-system-time.html
        \*/
        readonly timeTravelQueries: boolean;

    /\*\*

    -   Schema name.
        \*/
        readonly schema?: string;

    /\*\*

    -   Replication setup.
        \*/
        readonly replication?: {
        /\*\*

        -   Master server used by orm to perform writes.
            \*/
            readonly master: CockroachConnectionCredentialsOptions;

        /\*\*

        -   List of read-from severs (slaves).
            \*/
            readonly slaves: CockroachConnectionCredentialsOptions[];
            };

    /\*\*

    -   sets the application_name var to help db administrators identify
    -   the service using this connection. Defaults to 'undefined'
        \*/
        readonly applicationName?: string;

    /\*\*

    -   Max number of transaction retries in case of 40001 error.
        \*/
        readonly maxTransactionRetries?: number;
        }

import {DatabaseType, LoggerOptions} from "typeorm";
import {QueryCacheProperties} from "./QueryCacheProperties";
import {PrepareLogMessagesOptions} from "typeorm/logger/Logger";

/\*\*

-   CommonDataSourceProperties is set of DataSource properties shared by all database types.
    \*/
    export interface CommonDataSourceProperties {
    /\*\*

    -   Database type. This value is required.
        \*/
        readonly type: DatabaseType;

    /\*\*

    -   Migrations table name, in case of different name from "migrations".
    -   Accepts single string name.
        \*/
        readonly migrationsTableName?: string;

    /\*\*

    -   Transaction mode for migrations to run in
        \*/
        readonly migrationsTransactionMode?: "all" | "none" | "each";

    /\*\*

    -   Typeorm metadata table name, in case of different name from "typeorm_metadata".
    -   Accepts single string name.
        \*/
        readonly metadataTableName?: string;

    /\*\*

    -   Logging options.
        \*/
        readonly logging?: LoggerOptions;

    readonly logFormat?: PrepareLogMessagesOptions;

    /\*\*

    -   Maximum number of milliseconds query should be executed before logger log a warning.
        \*/
        readonly maxQueryExecutionTime?: number;

    /\*\*

    -   Maximum number of clients the pool should contain.
        \*/
        readonly poolSize?: number;

    /\*\*

    -   Indicates if database schema should be auto created on every application launch.
    -   Be careful with this option and don't use this in production - otherwise you can lose production data.
    -   This option is useful during debug and development.
    -   Alternative to it, you can use CLI and run schema:sync command.
    -
    -   Note that for MongoDB database it does not create schema, because MongoDB is schemaless.
    -   Instead, it syncs just by creating indices.
        \*/
        readonly synchronize?: boolean;

    /\*\*

    -   Indicates if migrations should be auto run on every application launch.
    -   Alternative to it, you can use CLI and run migrations:run command.
        \*/
        readonly migrationsRun?: boolean;

    /\*\*

    -   Drops the schema each time connection is being established.
    -   Be careful with this option and don't use this in production - otherwise you'll lose all production data.
    -   This option is useful during debug and development.
        \*/
        readonly dropSchema?: boolean;

    /\*\*

    -   Prefix to use on all tables (collections) of this connection in the database.
        \*/
        readonly entityPrefix?: string;

    /\*\*

    -   When creating new Entity instances, skip all constructors when true.
        \*/
        readonly entitySkipConstructor?: boolean;

    /\*\*

    -   Extra connection options to be passed to the underlying driver.
    -
    -   todo: deprecate this and move all database-specific types into hts own connection options object.
        \*/
        readonly extra?: any;

    /\*\*

    -   Specifies how relations must be loaded - using "joins" or separate queries.
    -   If you are loading too much data with nested joins it's better to load relations
    -   using separate queries.
    -
    -   Default strategy is "join", but this default can be changed here.
    -   Also, strategy can be set per-query in FindOptions and QueryBuilder.
        \*/
        readonly relationLoadStrategy?: "join" | "query";

    /\*\*

    -   Optionally applied "typename" to the model.
    -   If set, then each hydrated model will have this property with the target model / entity name inside.
    -
    -   (works like a discriminator property).
        \*/
        readonly typename?: string;

    /\*\*

    -   Holds reference to the baseDirectory where configuration file are expected.
    -
    -   @internal
        \*/
        baseDirectory?: string;

    /\*\*

    -   Allows to setup cache options.
        \*/
        readonly cache?: boolean | QueryCacheProperties;
        }

/\*\*

-   MongoDB specific connection options.
-   Synced with http://mongodb.github.io/node-mongodb-native/3.1/api/MongoClient.html
    \*/
    export interface MongoConnectionProperties {
    /\*\*

    -   Connection url where perform connection to.
        \*/
        readonly url?: string;

    /\*\*

    -   Database host.
        \*/
        readonly host?: string;

    /\*\*

    -   Database host replica set.
        \*/
        readonly hostReplicaSet?: string;

    /\*\*

    -   Database host port.
        \*/
        readonly port?: number;

    /\*\*

    -   Database username.
        \*/
        readonly username?: string;

    /\*\*

    -   Database password.
        \*/
        readonly password?: string;

    /\*\*

    -   Database name to connect to.
        \*/
        readonly database?: string;

    /\*\*

    -   Specifies whether to force dispatch all operations to the specified host. Default: false
        \*/
        readonly directConnection?: boolean;

    /\*\*

    -   The driver object
    -   This defaults to require("mongodb")
        \*/
        readonly driver?: any;

    /\*\*

    -   Use ssl connection (needs to have a mongod server with ssl support). Default: false
        \*/
        readonly ssl?: boolean;

    /\*\*

    -   Validate mongod server certificate against ca (needs to have a mongod server with ssl support, 2.4 or higher).
    -   Default: true
        \*/
        readonly sslValidate?: boolean;

    /\*\*

    -   Array of valid certificates either as Buffers or Strings
    -   (needs to have a mongod server with ssl support, 2.4 or higher).
        \*/
        readonly sslCA?: string | Buffer;

    /\*\*

    -   String or buffer containing the certificate we wish to present
    -   (needs to have a mongod server with ssl support, 2.4 or higher)
        \*/
        readonly sslCert?: string | Buffer;

    /\*\*

    -   String or buffer containing the certificate private key we wish to present
    -   (needs to have a mongod server with ssl support, 2.4 or higher)
        \*/
        readonly sslKey?: string;

    /\*\*

    -   String or buffer containing the certificate password
    -   (needs to have a mongod server with ssl support, 2.4 or higher)
        \*/
        readonly sslPass?: string | Buffer;

    /\*\*

    -   SSL Certificate revocation list binary buffer
    -   (needs to have a mongod server with ssl support, 2.4 or higher)
        \*/
        readonly sslCRL?: string | Buffer;

    /\*\*

    -   Reconnect on error. Default: true
        \*/
        readonly autoReconnect?: boolean;

    /\*\*

    -   TCP Socket NoDelay option. Default: true
        \*/
        readonly noDelay?: boolean;

    /\*\*

    -   The number of milliseconds to wait before initiating keepAlive on the TCP socket. Default: 30000
        \*/
        readonly keepAlive?: number;

    /\*\*

    -   TCP Connection timeout setting. Default: 30000
        \*/
        readonly connectTimeoutMS?: number;

    /\*\*

    -   Version of IP stack. Can be 4, 6.
    -   If undefined, will attempt to connect with IPv6, and will fall back to IPv4 on failure
        \*/
        readonly family?: number;

    /\*\*

    -   TCP Socket timeout setting. Default: 360000
        \*/
        readonly socketTimeoutMS?: number;

    /\*\*

    -   Server attempt to reconnect #times. Default 30
        \*/
        readonly reconnectTries?: number;

    /\*\*

    -   Server will wait #milliseconds between retries. Default 1000
        \*/
        readonly reconnectInterval?: number;

    /\*\*

    -   Control if high availability monitoring runs for Replicaset or Mongos proxies. Default true
        \*/
        readonly ha?: boolean;

    /\*\*

    -   The High availability period for replicaset inquiry. Default: 10000
        \*/
        readonly haInterval?: number;

    /\*\*

    -   The name of the replicaset to connect to
        \*/
        readonly replicaSet?: string;

    /\*\*

    -   Sets the range of servers to pick when using NEAREST (lowest ping ms + the latency fence, ex: range of 1 to (1 + 15) ms).
    -   Default: 15
        \*/
        readonly acceptableLatencyMS?: number;

    /\*\*

    -   Sets the range of servers to pick when using NEAREST (lowest ping ms + the latency fence, ex: range of 1 to (1 + 15) ms).
    -   Default: 15
        \*/
        readonly secondaryAcceptableLatencyMS?: number;

    /\*\*

    -   Sets if the driver should connect even if no primary is available. Default: false
        \*/
        readonly connectWithNoPrimary?: boolean;

    /\*\*

    -   If the database authentication is dependent on another databaseName.
        \*/
        readonly authSource?: string;

    /\*\*

    -   The write concern.
        \*/
        readonly w?: string | number;

    /\*\*

    -   The write concern timeout value.
        \*/
        readonly wtimeout?: number;

    /\*\*

    -   Specify a journal write concern. Default: false
        \*/
        readonly j?: boolean;

    /\*\*

    -   Force server to assign \_id values instead of driver. Default: false
        \*/
        readonly forceServerObjectId?: boolean;

    /\*\*

    -   Serialize functions on any object. Default: false
        \*/
        readonly serializeFunctions?: boolean;

    /\*\*

    -   Specify if the BSON serializer should ignore undefined fields. Default: false
        \*/
        readonly ignoreUndefined?: boolean;

    /\*\*

    -   Return document results as raw BSON buffers. Default: false
        \*/
        readonly raw?: boolean;

    /\*\*

    -   Promotes Long values to number if they fit inside the 53 bits resolution. Default: true
        \*/
        readonly promoteLongs?: boolean;

    /\*\*

    -   Promotes Binary BSON values to native Node Buffers. Default: false
        \*/
        readonly promoteBuffers?: boolean;

    /\*\*

    -   Promotes BSON values to native types where possible, set to false to only receive wrapper types. Default: true
        \*/
        readonly promoteValues?: boolean;

    /\*\*

    -   Enable the wrapping of the callback in the current domain, disabled by default to avoid perf hit. Default: false
        \*/
        readonly domainsEnabled?: boolean;

    /\*\*

    -   Sets a cap on how many operations the driver will buffer up before giving up on getting a working connection,
    -   default is -1 which is unlimited.
        \*/
        readonly bufferMaxEntries?: number;

    /\*\*

    -   The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY,
    -   ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
        \*/
        readonly readPreference?: "primary" | "primaryPreferred" | "secondary" | "secondaryPreferred" | "nearest";

    /\*\*

    -   Specify a maxStalenessSeconds value for secondary reads, minimum is 90 seconds
        \*/
        readonly maxStalenessSeconds?: number;

    /\*\*

    -   Ensure we check server identify during SSL, set to false to disable checking. Only works for Node 0.12.x or higher.
    -   Default: true
        \*/
        readonly checkServerIdentity?: boolean;

    /\*\*

    -   Validate MongoClient passed in options for correctness. Default: false
        \*/
        readonly validateOptions?: boolean | any;

    /\*\*

    -   The name of the application that created this MongoClient instance. MongoDB 3.4 and newer will print this value in the server log upon establishing each connection. It is also recorded in the slow query log and profile collections
        \*/
        readonly appname?: string;

    /\*\*

    -   Sets the authentication mechanism that MongoDB will use to authenticate the connection
        \*/
        readonly authMechanism?: string;

    /\*\*

    -   Specify a file sync write concern. Default: false
        \*/
        readonly fsync?: boolean;

    /\*\*

    -   The number of retries for a tailable cursor. Default: 5
        \*/
        readonly numberOfRetries?: number;

    /\*\*

    -   Enable auto reconnecting for single server instances. Default: true
        \*/
        readonly auto_reconnect?: boolean;

    /\*\*

    -   Enable command monitoring for this client. Default: false
        \*/
        readonly monitorCommands?: boolean;

    /\*\*

    -   If present, the connection pool will be initialized with minSize connections, and will never dip below minSize connections
        \*/
        readonly minSize?: number;

    /\*\*

    -   Determines whether or not to use the new url parser. Default: false
        \*/
        readonly useNewUrlParser?: boolean;

    /\*\*

    -   Determines whether or not to use the new Server Discovery and Monitoring engine. Default: false
    -   https://github.com/mongodb/node-mongodb-native/releases/tag/v3.2.1
        \*/
        readonly useUnifiedTopology?: boolean;

    /\*\*

    -   Enables or disables the ability to retry writes upon encountering transient network errors.
        \*/
        readonly retryWrites?: boolean;
        }

import {MysqlConnectionCredentialsOptions} from "typeorm/driver/mysql/MysqlConnectionCredentialsOptions";

/\*\*

-   MySQL specific connection options.
-
-   @see https://github.com/mysqljs/mysql#connection-options
    \*/
    export interface MysqlConnectionProperties extends MysqlConnectionCredentialsOptions {
    /\*\*

    -   The charset for the connection. This is called "collation" in the SQL-level of MySQL (like utf8_general_ci).
    -   If a SQL-level charset is specified (like utf8mb4) then the default collation for that charset is used.
    -   Default: 'UTF8_GENERAL_CI'
        \*/
        readonly charset?: string;

    /\*\*

    -   The timezone configured on the MySQL server.
    -   This is used to type cast server date/time values to JavaScript Date object and vice versa.
    -   This can be 'local', 'Z', or an offset in the form +HH:MM or -HH:MM. (Default: 'local')
        \*/
        readonly timezone?: string;

    /\*\*

    -   The milliseconds before a timeout occurs during the initial connection to the MySQL server. (Default: 10000)
        \*/
        readonly connectTimeout?: number;

    /\*\*

    -   The milliseconds before a timeout occurs during the initial connection to the MySQL server. (Default: 10000)
    -   This difference between connectTimeout and acquireTimeout is subtle and is described in the mysqljs/mysql docs
    -   https://github.com/mysqljs/mysql/tree/master#pool-options
        \*/
        readonly acquireTimeout?: number;

    /\*\*

    -   Allow connecting to MySQL instances that ask for the old (insecure) authentication method. (Default: false)
        \*/
        readonly insecureAuth?: boolean;

    /\*\*

    -   When dealing with big numbers (BIGINT and DECIMAL columns) in the database, you should enable this option (Default: false)
        \*/
        readonly supportBigNumbers?: boolean;

    /\*\*

    -   Enabling both supportBigNumbers and bigNumberStrings forces big numbers (BIGINT and DECIMAL columns) to be always
    -   returned as JavaScript String objects (Default: false). Enabling supportBigNumbers but leaving bigNumberStrings
    -   disabled will return big numbers as String objects only when they cannot be accurately represented with
    -   [JavaScript Number objects](http://ecma262-5.com/ELS5_HTML.htm#Section_8.5) (which happens when they exceed the [-2^53, +2^53] range),
    -   otherwise they will be returned as Number objects. This option is ignored if supportBigNumbers is disabled.
        \*/
        readonly bigNumberStrings?: boolean;

    /\*\*

    -   Force date types (TIMESTAMP, DATETIME, DATE) to be returned as strings rather then inflated into JavaScript Date objects.
    -   Can be true/false or an array of type names to keep as strings.
        \*/
        readonly dateStrings?: boolean | string[];

    /\*\*

    -   Prints protocol details to stdout. Can be true/false or an array of packet type names that should be printed.
    -   (Default: false)
        \*/
        readonly debug?: boolean | string[];

    /\*\*

    -   Generates stack traces on Error to include call site of library entrance ("long stack traces").
    -   Slight performance penalty for most calls. (Default: true)
        \*/
        readonly trace?: boolean;

    /\*\*

    -   Allow multiple mysql statements per query. Be careful with this, it could increase the scope of SQL injection attacks.
    -   (Default: false)
        \*/
        readonly multipleStatements?: boolean;

    /\*\*

    -   Use spatial functions like GeomFromText and AsText which are removed in MySQL 8.
    -   (Default: true)
        \*/
        readonly legacySpatialSupport?: boolean;

    /\*\*

    -   List of connection flags to use other than the default ones. It is also possible to blacklist default ones.
    -   For more information, check https://github.com/mysqljs/mysql#connection-flags.
        \*/
        readonly flags?: string[];

    /\*\*

    -   TypeORM will automatically use package found in your node_modules, prioritizing mysql over mysql2,
    -   but you can specify it manually
        \*/
        readonly connectorPackage?: "mysql" | "mysql2";

    /\*\*

    -   Replication setup.
        \*/
        readonly replication?: {
        /\*\*

        -   Master server used by orm to perform writes.
            \*/
            readonly master: MysqlConnectionCredentialsOptions;

        /\*\*

        -   List of read-from severs (slaves).
            \*/
            readonly slaves: MysqlConnectionCredentialsOptions[];

        /\*\*

        -   If true, PoolCluster will attempt to reconnect when connection fails. (Default: true)
            \*/
            readonly canRetry?: boolean;

        /\*\*

        -   If connection fails, node's errorCount increases.
        -   When errorCount is greater than removeNodeErrorCount, remove a node in the PoolCluster. (Default: 5)
            \*/
            readonly removeNodeErrorCount?: number;

        /\*\*

        -   If connection fails, specifies the number of milliseconds before another connection attempt will be made.
        -   If set to 0, then node will be removed instead and never re-used. (Default: 0)
            \*/
            readonly restoreNodeTimeout?: number;

        /\*\*

        -   Determines how slaves are selected:
        -   RR: Select one alternately (Round-Robin).
        -   RANDOM: Select the node by random function.
        -   ORDER: Select the first node available unconditionally.
            \*/
            readonly selector?: "RR" | "RANDOM" | "ORDER";
            };
            }

import {MysqlConnectionOptions} from "typeorm/driver/mysql/MysqlConnectionOptions";
import {PostgresConnectionOptions} from "typeorm/driver/postgres/PostgresConnectionOptions";
import {CockroachConnectionOptions} from "typeorm/driver/cockroachdb/CockroachConnectionOptions";
import {SqliteConnectionOptions} from "typeorm/driver/sqlite/SqliteConnectionOptions";
import {SqlServerConnectionOptions} from "typeorm/driver/sqlserver/SqlServerConnectionOptions";
import {SapConnectionOptions} from "typeorm/driver/sap/SapConnectionOptions";
import {OracleConnectionOptions} from "typeorm/driver/oracle/OracleConnectionOptions";
import {MongoConnectionOptions} from "typeorm/driver/mongodb/MongoConnectionOptions";
import {AuroraMysqlConnectionOptions} from "typeorm/driver/aurora-mysql/AuroraMysqlConnectionOptions";
import {AuroraPostgresConnectionOptions} from "typeorm/driver/aurora-postgres/AuroraPostgresConnectionOptions";
import {BetterSqlite3ConnectionOptions} from "typeorm/driver/better-sqlite3/BetterSqlite3ConnectionOptions";
import {SpannerConnectionOptions} from "typeorm/driver/spanner/SpannerConnectionOptions";

type NotOverridable = "subscribers" | "namingStrategy" | "cache" | "logger" | "entities" | "migrations";

export type NodeBootDataSourceOptions =
| Omit<MysqlConnectionOptions, NotOverridable>
| Omit<PostgresConnectionOptions, NotOverridable>
| Omit<CockroachConnectionOptions, NotOverridable>
| Omit<SqliteConnectionOptions, NotOverridable>
| Omit<SqlServerConnectionOptions, NotOverridable>
| Omit<SapConnectionOptions, NotOverridable>
| Omit<OracleConnectionOptions, NotOverridable>
| Omit<MongoConnectionOptions, NotOverridable>
| Omit<AuroraMysqlConnectionOptions, NotOverridable>
| Omit<AuroraPostgresConnectionOptions, NotOverridable>
| Omit<BetterSqlite3ConnectionOptions, NotOverridable>
| Omit<SpannerConnectionOptions, NotOverridable>;

import {OracleConnectionCredentialsOptions} from "typeorm/driver/oracle/OracleConnectionCredentialsOptions";

/\*\*

-   Oracle-specific connection options.
    \*/
    export interface OracleConnectionProperties extends OracleConnectionCredentialsOptions {
    /\*\*

    -   Schema name. By default is "public".
        \*/
        readonly schema?: string;

    /\*\*

    -   A boolean determining whether to pass time values in UTC or local time. (default: false).
        \*/
        readonly useUTC?: boolean;

    /\*\*

    -   Replication setup.
        \*/
        readonly replication?: {
        /\*\*

        -   Master server used by orm to perform writes.
            \*/
            readonly master: OracleConnectionCredentialsOptions;

        /\*\*

        -   List of read-from severs (slaves).
            \*/
            readonly slaves: OracleConnectionCredentialsOptions[];
            };
            }

import {CommonDataSourceProperties} from "./CommonDataSourceProperties";
import {MysqlConnectionProperties} from "./MysqlConnectionProperties";
import {PostgresConnectionProperties} from "./PostgresConnectionProperties";
import {AuroraPostgresConnectionProperties} from "./AuroraPostgresConnectionProperties";
import {AuroraMysqlConnectionProperties} from "./AuroraMysqlConnectionProperties";
import {BetterSqlite3ConnectionProperties} from "./BetterSqlite3ConnectionProperties";
import {CockroachConnectionProperties} from "./CockroachConnectionProperties";
import {MongoConnectionProperties} from "./MongoConnectionProperties";
import {OracleConnectionProperties} from "./OracleConnectionProperties";
import {SapConnectionProperties} from "./SapConnectionProperties";
import {SpannerConnectionProperties} from "./SpannerConnectionProperties";
import {SqliteConnectionProperties} from "./SqliteConnectionProperties";
import {SqlServerConnectionProperties} from "./SqlServerConnectionProperties";
import {TransactionConfigProperties} from "./TransactionConfigProperties";

export type PersistenceProperties = CommonDataSourceProperties & {
"aurora-mysql": AuroraMysqlConnectionProperties;
"aurora-postgres": AuroraPostgresConnectionProperties;
"better-sqlite3": BetterSqlite3ConnectionProperties;
cockroachdb: CockroachConnectionProperties;
mongodb: MongoConnectionProperties;
mysql: MysqlConnectionProperties;
mariadb: MysqlConnectionProperties;
oracle: OracleConnectionProperties;
postgres: PostgresConnectionProperties;
sap: SapConnectionProperties;
spanner: SpannerConnectionProperties;
sqlite: SqliteConnectionProperties;
mssql: SqlServerConnectionProperties;
transactions?: TransactionConfigProperties;
};

import {PostgresConnectionCredentialsOptions} from "typeorm/driver/postgres/PostgresConnectionCredentialsOptions";

/\*\*

-   Postgres-specific connection options.
    \*/
    export interface PostgresConnectionProperties extends PostgresConnectionCredentialsOptions {
    /\*\*

    -   Schema name.
        \*/
        readonly schema?: string;

    /\*\*

    -   A boolean determining whether to pass time values in UTC or local time. (default: false).
        \*/
        readonly useUTC?: boolean;

    /\*\*

    -   Replication setup.
        \*/
        readonly replication?: {
        /\*\*

        -   Master server used by orm to perform writes.
            \*/
            readonly master: PostgresConnectionCredentialsOptions;

        /\*\*

        -   List of read-from severs (slaves).
            \*/
            readonly slaves: PostgresConnectionCredentialsOptions[];
            };

    /\*\*

    -   The milliseconds before a timeout occurs during the initial connection to the postgres
    -   server. If undefined, or set to 0, there is no timeout. Defaults to undefined.
        \*/
        readonly connectTimeoutMS?: number;

    /\*\*

    -   The Postgres extension to use to generate UUID columns. Defaults to uuid-ossp.
    -   If pgcrypto is selected, TypeORM will use the gen_random_uuid() function from this extension.
    -   If uuid-ossp is selected, TypeORM will use the uuid_generate_v4() function from this extension.
        \*/
        readonly uuidExtension?: "pgcrypto" | "uuid-ossp";

    /\*\*

    -   Include notification messages from Postgres server in client logs
        \*/
        readonly logNotifications?: boolean;

    /\*\*

    -   Automatically install postgres extensions
        \*/
        readonly installExtensions?: boolean;

    /\*\*

    -   sets the application_name var to help db administrators identify
    -   the service using this connection. Defaults to 'undefined'
        \*/
        readonly applicationName?: string;

    /\*\*

    -   Return 64-bit integers (int8) as JavaScript integers.
    -
    -   Because JavaScript doesn't have support for 64-bit integers node-postgres cannot confidently
    -   parse int8 data type results as numbers because if you have a huge number it will overflow
    -   and the result you'd get back from node-postgres would not be the result in the database.
    -   That would be a very bad thing so node-postgres just returns int8 results as strings and leaves the parsing up to you.
    -
    -   Enabling parseInt8 will cause node-postgres to parse int8 results as numbers.
    -   Note: the maximum safe integer in js is: Number.MAX_SAFE_INTEGER (`+2^53`)
    -
    -   @see [JavaScript Number objects](http://ecma262-5.com/ELS5_HTML.htm#Section_8.5)
    -   @see [node-postgres int8 explanation](<https://github.com/brianc/node-pg-types#:~:text=on%20projects%3A%20return-,64%2Dbit%20integers,-(int8)%20as>)
    -   @see [node-postgres defaults.parseInt8 implementation](https://github.com/brianc/node-postgres/blob/pg%408.8.0/packages/pg/lib/defaults.js#L80)
        \*/
        readonly parseInt8?: boolean;
        }

export type QueryCacheProperties = {
/\*\*

-   Type of caching.
-
-   -   "database" means cached values will be stored in the separate table in database. This is default value.
-   -   "redis" means cached values will be stored inside redis. You must provide redis connection options.
        \*/
        type?: "database" | "redis" | "ioredis" | "ioredis/cluster"; // todo: add mongodb and other cache providers as well in the future

            /**
             * Configurable table name for "database" type cache.
             * Default value is "query-result-cache"
             */
            tableName?: string;

            /**
             * Used to provide redis connection options.
             */
            options?: any;

            /**
             * If set to true then queries (using find methods and QueryBuilder's methods) will always be cached.
             */
            alwaysEnabled?: boolean;

            /**
             * Time in milliseconds in which cache will expire.
             * This can be setup per-query.
             * Default value is 1000 which is equivalent to 1 second.
             */
            duration?: number;

            /**
             * Used to specify if cache errors should be ignored, and pass through the call to the Database.
             */
            ignoreErrors?: boolean;

        };

import {SapConnectionCredentialsOptions} from "typeorm/driver/sap/SapConnectionCredentialsOptions";

/\*\*

-   SAP Hana specific connection options.
    \*/
    export interface SapConnectionProperties extends SapConnectionCredentialsOptions {
    /\*\*

    -   Database schema.
        \*/
        readonly schema?: string;

    /\*\*

    -   Pool options.
        \*/
        readonly pool?: {
        /\*\*

        -   Max number of connections.
            \*/
            readonly max?: number;

        /\*\*

        -   Minimum number of connections.
            \*/
            readonly min?: number;

        /\*\*

        -   Maximum number of waiting requests allowed. (default=0, no limit).
            \*/
            readonly maxWaitingRequests?: number;
            /\*\*
        -   Max milliseconds a request will wait for a resource before timing out. (default=5000)
            \*/
            readonly requestTimeout?: number;
            /\*\*
        -   How often to run resource timeout checks. (default=0, disabled)
            \*/
            readonly checkInterval?: number;
            /\*\*
        -   Idle timeout
            \*/
            readonly idleTimeout?: number;
            };

    readonly poolSize?: never;
    }

import {SpannerConnectionCredentialsOptions} from "typeorm/driver/spanner/SpannerConnectionCredentialsOptions";

/\*\*

-   Spanner specific connection options.
    \*/
    export interface SpannerConnectionProperties extends SpannerConnectionCredentialsOptions {
    /\*\*

    -   Database type.
        \*/
        readonly type: "spanner";

    // todo
    readonly database?: string;

    // todo
    readonly schema?: string;

    /\*\*

    -   The charset for the connection. This is called "collation" in the SQL-level of MySQL (like utf8_general_ci).
    -   If a SQL-level charset is specified (like utf8mb4) then the default collation for that charset is used.
    -   Default: 'UTF8_GENERAL_CI'
        \*/
        readonly charset?: string;

    /\*\*

    -   The timezone configured on the MySQL server.
    -   This is used to type cast server date/time values to JavaScript Date object and vice versa.
    -   This can be 'local', 'Z', or an offset in the form +HH:MM or -HH:MM. (Default: 'local')
        \*/
        readonly timezone?: string;

    /\*\*

    -   The milliseconds before a timeout occurs during the initial connection to the MySQL server. (Default: 10000)
        \*/
        readonly connectTimeout?: number;

    /\*\*

    -   The milliseconds before a timeout occurs during the initial connection to the MySQL server. (Default: 10000)
    -   This difference between connectTimeout and acquireTimeout is subtle and is described in the mysqljs/mysql docs
    -   https://github.com/mysqljs/mysql/tree/master#pool-options
        \*/
        readonly acquireTimeout?: number;

    /\*\*

    -   Allow connecting to MySQL instances that ask for the old (insecure) authentication method. (Default: false)
        \*/
        readonly insecureAuth?: boolean;

    /\*\*

    -   When dealing with big numbers (BIGINT and DECIMAL columns) in the database, you should enable this option (Default: false)
        \*/
        readonly supportBigNumbers?: boolean;

    /\*\*

    -   Enabling both supportBigNumbers and bigNumberStrings forces big numbers (BIGINT and DECIMAL columns) to be always
    -   returned as JavaScript String objects (Default: false). Enabling supportBigNumbers but leaving bigNumberStrings
    -   disabled will return big numbers as String objects only when they cannot be accurately represented with
    -   [JavaScript Number objects](http://ecma262-5.com/ELS5_HTML.htm#Section_8.5) (which happens when they exceed the [-2^53, +2^53] range),
    -   otherwise they will be returned as Number objects. This option is ignored if supportBigNumbers is disabled.
        \*/
        readonly bigNumberStrings?: boolean;

    /\*\*

    -   Force date types (TIMESTAMP, DATETIME, DATE) to be returned as strings rather then inflated into JavaScript Date objects.
    -   Can be true/false or an array of type names to keep as strings.
        \*/
        readonly dateStrings?: boolean | string[];

    /\*\*

    -   Prints protocol details to stdout. Can be true/false or an array of packet type names that should be printed.
    -   (Default: false)
        \*/
        readonly debug?: boolean | string[];

    /\*\*

    -   Generates stack traces on Error to include call site of library entrance ("long stack traces").
    -   Slight performance penalty for most calls. (Default: true)
        \*/
        readonly trace?: boolean;

    /\*\*

    -   Allow multiple mysql statements per query. Be careful with this, it could increase the scope of SQL injection attacks.
    -   (Default: false)
        \*/
        readonly multipleStatements?: boolean;

    /\*\*

    -   Use spatial functions like GeomFromText and AsText which are removed in MySQL 8.
    -   (Default: true)
        \*/
        readonly legacySpatialSupport?: boolean;

    /\*\*

    -   List of connection flags to use other than the default ones. It is also possible to blacklist default ones.
    -   For more information, check https://github.com/mysqljs/mysql#connection-flags.
        \*/
        readonly flags?: string[];

    /\*\*

    -   Replication setup.
        \*/
        readonly replication?: {
        /\*\*

        -   Master server used by orm to perform writes.
            \*/
            readonly master: SpannerConnectionCredentialsOptions;

        /\*\*

        -   List of read-from severs (slaves).
            \*/
            readonly slaves: SpannerConnectionCredentialsOptions[];

        /\*\*

        -   If true, PoolCluster will attempt to reconnect when connection fails. (Default: true)
            \*/
            readonly canRetry?: boolean;

        /\*\*

        -   If connection fails, node's errorCount increases.
        -   When errorCount is greater than removeNodeErrorCount, remove a node in the PoolCluster. (Default: 5)
            \*/
            readonly removeNodeErrorCount?: number;

        /\*\*

        -   If connection fails, specifies the number of milliseconds before another connection attempt will be made.
        -   If set to 0, then node will be removed instead and never re-used. (Default: 0)
            \*/
            readonly restoreNodeTimeout?: number;

        /\*\*

        -   Determines how slaves are selected:
        -   RR: Select one alternately (Round-Robin).
        -   RANDOM: Select the node by random function.
        -   ORDER: Select the first node available unconditionally.
            \*/
            readonly selector?: "RR" | "RANDOM" | "ORDER";
            };

    readonly poolSize?: never;
    }

/\*\*

-   Sqlite-specific connection options.
    \*/
    export interface SqliteConnectionProperties {
    /\*\*

    -   Storage type or path to the storage.
        \*/
        readonly database: string;

    /\*\*

    -   Encryption key for for SQLCipher.
        \*/
        readonly key?: string;

    /\*\*

    -   In your SQLite application when you perform parallel writes its common to face SQLITE_BUSY error.
    -   This error indicates that SQLite failed to write to the database file since someone else already writes into it.
    -   Since SQLite cannot handle parallel saves this error cannot be avoided.
    -
    -   To simplify life's of those who have this error this particular option sets a timeout within which ORM will try
    -   to perform requested write operation again and again until it receives SQLITE_BUSY error.
    -
    -   Enabling WAL can improve your app performance and face less SQLITE_BUSY issues.
    -   Time in milliseconds.
        \*/
        readonly busyErrorRetry?: number;

    /\*\*

    -   Enables WAL mode. By default its disabled.
    -
    -   @see https://www.sqlite.org/wal.html
        \*/
        readonly enableWAL?: boolean;

    /\*\*

    -   Specifies the open file flags. By default its undefined.
    -   @see https://www.sqlite.org/c3ref/c_open_autoproxy.html
    -   @see https://github.com/TryGhost/node-sqlite3/blob/master/test/open_close.test.js
        \*/
        readonly flags?: number;

    readonly poolSize?: never;

    /\*\*

    -   Query or change the setting of the busy timeout.
    -   Time in milliseconds.
    -
    -   @see https://www.sqlite.org/pragma.html#pragma_busy_timeout
        \*/
        readonly busyTimeout?: number;
        }

import {SqlServerConnectionCredentialsOptions} from "typeorm/driver/sqlserver/SqlServerConnectionCredentialsOptions";

/\*\*

-   Microsoft Sql Server specific connection options.
    \*/
    export interface SqlServerConnectionProperties extends SqlServerConnectionCredentialsOptions {
    /\*\*

    -   Connection timeout in ms (default: 15000).
        \*/
        readonly connectionTimeout?: number;

    /\*\*

    -   Request timeout in ms (default: 15000). NOTE: msnodesqlv8 driver doesn't support timeouts < 1 second.
        \*/
        readonly requestTimeout?: number;

    /\*\*

    -   Stream recordsets/rows instead of returning them all at once as an argument of callback (default: false).
    -   You can also enable streaming for each request independently (request.stream = true).
    -   Always set to true if you plan to work with large amount of rows.
        \*/
        readonly stream?: boolean;

    /\*\*

    -   Database schema.
        \*/
        readonly schema?: string;

    /\*\*

    -   An optional object/dictionary with the any of the properties
        \*/
        readonly pool?: {
        /\*\*

        -   Maximum number of resources to create at any given time. (default=1)
            \*/
            readonly max?: number;

        /\*\*

        -   Minimum number of resources to keep in pool at any given time. If this is set >= max, the pool will silently
        -   set the min to equal max. (default=0)
            \*/
            readonly min?: number;

        /\*\*

        -   Maximum number of queued requests allowed, additional acquire calls will be callback with an err in a future
        -   cycle of the event loop.
            \*/
            readonly maxWaitingClients?: number;

        /\*\*

        -   Should the pool validate resources before giving them to clients. Requires that either factory.validate or
        -   factory.validateAsync to be specified
            \*/
            readonly testOnBorrow?: boolean;

        /\*\*

        -   Max milliseconds an acquire call will wait for a resource before timing out. (default no limit), if supplied should non-zero positive integer.
            \*/
            readonly acquireTimeoutMillis?: number;

        /\*\*

        -   If true the oldest resources will be first to be allocated. If false the most recently released resources will
        -   be the first to be allocated. This in effect turns the pool's behaviour from a queue into a stack. boolean,
        -   (default true)
            \*/
            readonly fifo?: boolean;

        /\*\*

        -   Int between 1 and x - if set, borrowers can specify their relative priority in the queue if no resources
        -   are available. see example. (default 1)
            \*/
            readonly priorityRange?: number;

        /\*\*

        -   How often to run eviction checks. Default: 0 (does not run).
            \*/
            readonly evictionRunIntervalMillis?: number;

        /\*\*

        -   Number of resources to check each eviction run. Default: 3.
            \*/
            readonly numTestsPerRun?: number;

        /\*\*

        -   Amount of time an object may sit idle in the pool before it is eligible for eviction by the idle object
        -   evictor (if any), with the extra condition that at least "min idle" object instances remain in the pool.
        -   Default -1 (nothing can get evicted)
            \*/
            readonly softIdleTimeoutMillis?: number;

        /\*\*

        -   The minimum amount of time that an object may sit idle in the pool before it is eligible for eviction due
        -   to idle time. Supercedes softIdleTimeoutMillis Default: 30000
            \*/
            readonly idleTimeoutMillis?: number;
            };

    /\*\*

    -   Extra options
        \*/
        readonly options?: {
        /\*\*

        -   The named instance to connect to
            \*/
            readonly instanceName?: string;

        /\*\*

        -   By default, if the database requestion by options.database cannot be accessed, the connection will fail with
        -   an error. However, if options.fallbackToDefaultDb is set to true, then the user's default database will
        -   be used instead (Default: false).
            \*/
            readonly fallbackToDefaultDb?: boolean;

        /\*\*

        -   If true, SET ANSI_NULL_DFLT_ON ON will be set in the initial sql. This means new columns will be nullable by
        -   default. See the T-SQL documentation for more details. (Default: true).
            \*/
            readonly enableAnsiNullDefault?: boolean;

        /\*\*

        -   The number of milliseconds before the attempt to connect is considered failed (default: 15000).
            \*/
            readonly connectTimeout?: number;

        /\*\*

        -   The number of milliseconds before the cancel (abort) of a request is considered failed (default: 5000).
            \*/
            readonly cancelTimeout?: number;

        /\*\*

        -   The size of TDS packets (subject to negotiation with the server). Should be a power of 2. (default: 4096).
            \*/
            readonly packetSize?: number;

        /\*\*

        -   A boolean determining whether to pass time values in UTC or local time. (default: false).
            \*/
            readonly useUTC?: boolean;

        /\*\*

        -   A boolean determining whether to rollback a transaction automatically if any error is encountered during
        -   the given transaction's execution. This sets the value for SET XACT_ABORT during the initial SQL phase
        -   of a connection (documentation).
            \*/
            readonly abortTransactionOnError?: boolean;

        /\*\*

        -   A string indicating which network interface (ip address) to use when connecting to SQL Server.
            \*/
            readonly localAddress?: string;

        /\*\*

        -   A boolean determining whether to return rows as arrays or key-value collections. (default: false).
            \*/
            readonly useColumnNames?: boolean;

        /\*\*

        -   A boolean, controlling whether the column names returned will have the first letter converted to lower case
        -   (true) or not. This value is ignored if you provide a columnNameReplacer. (default: false).
            \*/
            readonly camelCaseColumns?: boolean;

        /\*\*

        -   A boolean, controlling whatever to disable RETURNING / OUTPUT statements.
            \*/
            readonly disableOutputReturning?: boolean;

        /\*\*

        -   A boolean, controlling whether MssqlParameter types char, varchar, and text are converted to their unicode equivalents, nchar, nvarchar, and ntext.
        -   (default: false, meaning that char/varchar/text parameters will be converted to nchar/nvarchar/ntext)
            \*/
            readonly disableAsciiToUnicodeParamConversion?: boolean;

        /\*\*

        -   Debug options
            \*/
            readonly debug?: {
            /\*\*

            -   A boolean, controlling whether debug events will be emitted with text describing packet details
            -   (default: false).
                \*/
                readonly packet?: boolean;

            /\*\*

            -   A boolean, controlling whether debug events will be emitted with text describing packet data details
            -   (default: false).
                \*/
                readonly data?: boolean;

            /\*\*

            -   A boolean, controlling whether debug events will be emitted with text describing packet payload details
            -   (default: false).
                \*/
                readonly payload?: boolean;

            /\*\*

            -   A boolean, controlling whether debug events will be emitted with text describing token stream tokens
            -   (default: false).
                \*/
                readonly token?: boolean;
                };

        /\*\*

        -   The default isolation level that transactions will be run with. The isolation levels are available
        -   from require('tedious').ISOLATION_LEVEL. (default: READ_COMMITTED).
            \*/
            readonly isolation?: "READ_UNCOMMITTED" | "READ_COMMITTED" | "REPEATABLE_READ" | "SERIALIZABLE" | "SNAPSHOT";

        /\*\*

        -   The default isolation level for new connections. All out-of-transaction queries are executed with this
        -   setting. The isolation levels are available from require('tedious').ISOLATION_LEVEL .
            \*/
            readonly connectionIsolationLevel?:
            | "READ_UNCOMMITTED"
            | "READ_COMMITTED"
            | "REPEATABLE_READ"
            | "SERIALIZABLE"
            | "SNAPSHOT";

        /\*\*

        -   A boolean, determining whether the connection will request read only access from a SQL Server
        -   Availability Group. For more information, see here. (default: false).
            \*/
            readonly readOnlyIntent?: boolean;

        /\*\*

        -   A boolean determining whether or not the connection will be encrypted. Set to true if you're on
        -   Windows Azure. (default: true).
            \*/
            readonly encrypt?: boolean;

        /\*\*

        -   When encryption is used, an object may be supplied that will be used for the first argument when calling
        -   tls.createSecurePair (default: {}).
            \*/
            readonly cryptoCredentialsDetails?: any;

        /\*\*

        -   A boolean, that when true will expose received rows in Requests' done\* events. See done, doneInProc and
        -   doneProc. (default: false)
        -   Caution: If many row are received, enabling this option could result in excessive memory usage.
            \*/
            readonly rowCollectionOnDone?: boolean;

        /\*\*

        -   A boolean, that when true will expose received rows in Requests' completion callback. See new Request. (default: false)
        -   Caution: If many row are received, enabling this option could result in excessive memory usage.
            \*/
            readonly rowCollectionOnRequestCompletion?: boolean;

        /\*\*

        -   The version of TDS to use. If server doesn't support specified version, negotiated version is used instead.
        -   The versions are available from require('tedious').TDS_VERSION. (default: 7_4).
            \*/
            readonly tdsVersion?: string;

        /\*\*

        -   A boolean, that when true will abort a query when an overflow or divide-by-zero error occurs during query execution.
            \*/
            readonly enableArithAbort?: boolean;

        /\*\*

        -   Application name used for identifying a specific application in profiling, logging or tracing tools of SQL Server.
        -   (default: node-mssql)
            \*/
            readonly appName?: string;

        /\*\*

        -   A boolean, controlling whether encryption occurs if there is no verifiable server certificate.
        -   (default: false)
            \*/
            readonly trustServerCertificate?: boolean;
            };

    /\*\*

    -   Replication setup.
        \*/
        readonly replication?: {
        /\*\*

        -   Master server used by orm to perform writes.
            \*/
            readonly master: SqlServerConnectionCredentialsOptions;

        /\*\*

        -   List of read-from severs (slaves).
            \*/
            readonly slaves: SqlServerConnectionCredentialsOptions[];
            };

    readonly poolSize?: never;
    }

import {StorageDriver} from "typeorm-transactional/dist/enums/storage-driver";

export interface TransactionConfigProperties {
/\*\*

-   Controls how many hooks (`commit`, `rollback`, `complete`) can be used simultaneously.
-   If you exceed the number of hooks of same type, you get a warning. This is a useful to find possible memory leaks.
-   You can set this options to `0` or `Infinity` to indicate an unlimited number of listeners.
    \*/
    maxHookHandlers?: number;
    /\*\*
-   Controls storage driver used for providing persistency during the async request timespan.
-   You can force any of the available drivers with this option.
-   By default, the modern AsyncLocalStorage will be preferred, if it is supported by your runtime.
    \*/
    storageDriver?: StorageDriver;
    }

The user documentation should:
1 - explain the architecture for the nodeboot persistence layer
2 - explain the auto-configuration process
2.1 - explain the integration and enablement into a nodeboot app (@EnableRepositories decorator)
3 - explain the different config options
4 - explain Persistence layer lifecycle
5 - explain entity creation and registration
6 - explain migrations
7 - explain datasource configuration
8 - explain listeners
9 - explain persistence cache
10 - explain persistence naming strategy
11 - explain Data Repositories
11.1 - Explain each repository interface and when to use it: Repository, MongoRepository, MongoPagingAndSortingRepository, PagingAndSortingRepository
12 - explain transactions
12.1 - explain transaction hooks
13 - Explain repository injection into services/components
14 - explain persistence hooks
