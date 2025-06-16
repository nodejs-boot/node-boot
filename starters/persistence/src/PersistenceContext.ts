import {RepositoryMetadata} from "./metadata";
import {NamingStrategyInterface} from "typeorm/naming-strategy/NamingStrategyInterface";
import {QueryResultCache} from "typeorm/cache/QueryResultCache";
import {EntitySubscriberInterface, MigrationInterface} from "typeorm";
import {NodeBootDataSourceOptions} from "./property/NodeBootDataSourceOptions";

/**
 * Centralized configuration holder for persistence-layer components.
 *
 * This singleton class is used to aggregate all necessary configurations
 * for a TypeORM-based persistence context, including repositories, migrations,
 * subscribers, naming strategy, query caching, and database options.
 *
 * It is designed for use in frameworks like NodeBoot or other structured apps
 * that need to configure and bootstrap the data layer in a centralized way.
 *
 * Usage:
 * ```ts
 * const context = PersistenceContext.get();
 * //context.repositories
 * //context.migrations
 * //context.eventSubscribers
 * //...
 * ```
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
export class PersistenceContext {
    private static context: PersistenceContext;

    /**
     * Metadata for all custom repositories managed in this context.
     */
    repositories: RepositoryMetadata[] = [];

    /**
     * Array of migration classes to be run by TypeORM.
     */
    migrations: (new (...args: any[]) => MigrationInterface)[] = [];

    /**
     * Array of event subscriber classes for lifecycle hooks.
     */
    eventSubscribers: (new (...args: any[]) => EntitySubscriberInterface)[] = [];

    /**
     * Optional custom naming strategy for database table and column naming.
     */
    namingStrategy?: new (...args: any[]) => NamingStrategyInterface;

    /**
     * Optional custom query result cache provider.
     */
    queryCache?: new (...args: any[]) => QueryResultCache;

    /**
     * Optional configuration to override the default database connection.
     */
    databaseConnectionOverrides?: NodeBootDataSourceOptions;

    /**
     * Whether to synchronize the database schema with entities.
     * (Typically used in dev only)
     */
    synchronizeDatabase?: boolean;

    /**
     * Whether TypeORM should automatically run pending migrations.
     */
    migrationsRun?: boolean;

    /**
     * Retrieves the singleton instance of the `PersistenceContext`.
     *
     * Ensures a single source of truth for persistence configuration throughout the app.
     *
     * @returns Singleton instance of `PersistenceContext`.
     */
    static get(): PersistenceContext {
        if (!PersistenceContext.context) {
            PersistenceContext.context = new PersistenceContext();
        }
        return PersistenceContext.context;
    }
}
