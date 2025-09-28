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

    /**
     * Adds a repository if not already present (prevents duplicates).
     */
    addRepository(repo: RepositoryMetadata): void {
        if (!this.repositories.some(r => r.target === repo.target && r.entity === repo.entity)) {
            this.repositories.push(repo);
        }
    }

    /**
     * Adds a migration if not already present (prevents duplicates).
     */
    addMigration(migration: new (...args: any[]) => MigrationInterface): void {
        if (!this.migrations.includes(migration)) {
            this.migrations.push(migration);
        }
    }

    /**
     * Adds an event subscriber if not already present (prevents duplicates).
     */
    addEventSubscriber(subscriber: new (...args: any[]) => EntitySubscriberInterface): void {
        if (!this.eventSubscribers.includes(subscriber)) {
            this.eventSubscribers.push(subscriber);
        }
    }

    /**
     * Clears all arrays and references in the context (does not reset the singleton itself).
     */
    clear(): void {
        this.repositories = [];
        this.migrations = [];
        this.eventSubscribers = [];
        this.namingStrategy = undefined;
        this.queryCache = undefined;
        this.databaseConnectionOverrides = undefined;
        this.synchronizeDatabase = undefined;
        this.migrationsRun = undefined;
    }

    /**
     * Resets the singleton context and clears all arrays and references.
     * Useful for tests and hot-reload environments to prevent memory leaks.
     */
    static reset(): void {
        if (PersistenceContext.context) {
            PersistenceContext.context.clear();
        }
        PersistenceContext.context = undefined as any;
    }
}
