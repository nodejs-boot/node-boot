/**
 * Persistence Test Utilities
 *
 * Provides helper functions for setting up integration tests with persistence.
 * Simplifies test setup by handling DataSource initialization and container management.
 */
import {Container} from "typedi";
import {DataSource} from "typeorm";
import {User} from "./postgres/entities/User.entity";
import {Counter} from "./postgres/entities/Counter.entity";

export interface PersistenceTestSetup {
    dataSource: DataSource;
    cleanup: () => Promise<void>;
}

/**
 * Initialize persistence for testing
 *
 * This utility handles:
 * - Creating and initializing a TypeORM DataSource
 * - Registering it in the DI container
 * - Providing cleanup function
 *
 * Usage in tests:
 * ```typescript
 * before(async () => {
 *   setup = await initializePersistence({
 *     databaseUrl: process.env.DATABASE_URL,
 *     // or individual properties:
 *     type: 'postgres',
 *     host: 'localhost',
 *     // ...
 *   });
 *   dataSource = setup.dataSource;
 * });
 *
 * after(async () => {
 *   await setup.cleanup();
 * });
 * ```
 */
export async function initializePersistence(options?: {
    databaseUrl?: string;
    type?: string;
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    database?: string;
}): Promise<PersistenceTestSetup> {
    const {
        type = "postgres",
        host = process.env.DB_HOST || "localhost",
        port = parseInt(process.env.DB_PORT || "5435"),
        username = process.env.DB_USER || "postgres",
        password = process.env.DB_PASSWORD || "postgres",
        database = process.env.DB_NAME || "test",
    } = options || {};

    const dataSource = new DataSource({
        type: type as any,
        host,
        port,
        username,
        password,
        database,
        entities: [User, Counter],
        synchronize: true,
        dropSchema: false,
    });

    await dataSource.initialize();

    // Register in container for injection
    Container.set(DataSource, dataSource);

    return {
        dataSource,
        cleanup: async () => {
            if (dataSource.isInitialized) {
                await dataSource.destroy();
            }
            Container.remove(DataSource);
        },
    };
}

/**
 * Clear all data from an entity
 * Useful for cleaning up between tests
 */
export async function clearEntity(dataSource: DataSource, entity: any): Promise<void> {
    const manager = dataSource.createEntityManager();
    await manager.clear(entity);
}

/**
 * Clear all test data before/after tests
 */
export async function clearAllTestData(dataSource: DataSource): Promise<void> {
    const manager = dataSource.createEntityManager();
    await manager.clear(User);
    await manager.clear(Counter);
}
