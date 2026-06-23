import {DataSource} from "typeorm";
import {describe, test} from "node:test";
import * as assert from "node:assert";
import {Counter, User} from "./setup/postgres.setup";

/**
 * Database Initialization & Consistency Integration Tests
 * Tests database setup, schema management, and data consistency
 */
describe("Database Initialization & Consistency (Integration)", () => {
    describe("DataSource Lifecycle", () => {
        test("should initialize datasource", async () => {
            const dataSource = new DataSource({
                type: "postgres",
                host: "localhost",
                port: 5435,
                username: "postgres",
                password: "postgres",
                database: "test",
                entities: [User, Counter],
                synchronize: true,
            });

            assert.strictEqual(dataSource.isInitialized, false);

            await dataSource.initialize();
            assert.strictEqual(dataSource.isInitialized, true);

            await dataSource.destroy();
            assert.strictEqual(dataSource.isInitialized, false);
        });

        test("should throw error on double initialization", async () => {
            const dataSource = new DataSource({
                type: "postgres",
                host: "localhost",
                port: 5435,
                username: "postgres",
                password: "postgres",
                database: "test",
                entities: [User, Counter],
                synchronize: true,
            });

            await dataSource.initialize();

            let errorThrown = false;
            try {
                await dataSource.initialize();
            } catch (e) {
                errorThrown = true;
            }

            assert.ok(errorThrown);

            await dataSource.destroy();
        });

        test("should get repository", async () => {
            const dataSource = new DataSource({
                type: "postgres",
                host: "localhost",
                port: 5435,
                username: "postgres",
                password: "postgres",
                database: "test",
                entities: [User, Counter],
                synchronize: true,
            });

            await dataSource.initialize();

            const userRepository = dataSource.getRepository(User);
            assert.ok(userRepository);
            assert.ok(userRepository.save);
            assert.ok(userRepository.find);

            await dataSource.destroy();
        });

        test("should get entity manager", async () => {
            const dataSource = new DataSource({
                type: "postgres",
                host: "localhost",
                port: 5435,
                username: "postgres",
                password: "postgres",
                database: "test",
                entities: [User, Counter],
                synchronize: true,
            });

            await dataSource.initialize();

            const manager = dataSource.manager;
            assert.ok(manager);
            assert.ok(manager.save);
            assert.ok(manager.find);

            await dataSource.destroy();
        });
    });

    describe("Schema Synchronization", () => {
        test("should create tables with synchronize", async () => {
            const dataSource = new DataSource({
                type: "postgres",
                host: "localhost",
                port: 5435,
                username: "postgres",
                password: "postgres",
                database: "test",
                entities: [User, Counter],
                synchronize: true,
                dropSchema: true, // Clean slate
            });

            await dataSource.initialize();

            const queryRunner = dataSource.createQueryRunner();
            const tables = await queryRunner.getTables();

            // Map table names
            const tableNames = tables.map(t => t.name);

            // Should have created the tables
            assert.ok(tableNames.includes("users") || tableNames.includes('"users"'));
            assert.ok(tableNames.includes("counters") || tableNames.includes('"counters"'));

            await queryRunner.release();
            await dataSource.destroy();
        });

        test("should not drop schema when synchronize is true but dropSchema is false", async () => {
            const dataSource = new DataSource({
                type: "postgres",
                host: "localhost",
                port: 5435,
                username: "postgres",
                password: "postgres",
                database: "test",
                entities: [User, Counter],
                synchronize: true,
                dropSchema: false,
            });

            await dataSource.initialize();

            const userRepository = dataSource.getRepository(User);
            await userRepository.save(new User("Persist Test", 100));

            await dataSource.destroy();

            // Reconnect and verify data persists
            const dataSource2 = new DataSource({
                type: "postgres",
                host: "localhost",
                port: 5435,
                username: "postgres",
                password: "postgres",
                database: "test",
                entities: [User, Counter],
                synchronize: true,
                dropSchema: false,
            });

            await dataSource2.initialize();

            const userRepository2 = dataSource2.getRepository(User);
            const user = await userRepository2.findOne({where: {name: "Persist Test"}});

            assert.ok(user);
            assert.strictEqual(user.name, "Persist Test");

            // Cleanup
            await userRepository2.remove(user);
            await dataSource2.destroy();
        });
    });

    describe("Transaction & Consistency", () => {
        test("should maintain data consistency in transaction", async () => {
            const dataSource = new DataSource({
                type: "postgres",
                host: "localhost",
                port: 5435,
                username: "postgres",
                password: "postgres",
                database: "test",
                entities: [User, Counter],
                synchronize: true,
            });

            await dataSource.initialize();

            const userRepository = dataSource.getRepository(User);

            // Initial state
            await userRepository.save(new User("Initial", 100));

            // Transaction
            await dataSource.transaction(async manager => {
                const initialUser = (await manager.findOne(User, {where: {name: "Initial"}}))!;
                initialUser.money = 200;
                await manager.save(initialUser);
            });

            // Verify consistency
            const finalUser = (await userRepository.findOne({where: {name: "Initial"}}))!;
            assert.strictEqual(finalUser.money, 200);

            await userRepository.remove(finalUser);
            await dataSource.destroy();
        });

        test("should rollback on transaction error", async () => {
            const dataSource = new DataSource({
                type: "postgres",
                host: "localhost",
                port: 5435,
                username: "postgres",
                password: "postgres",
                database: "test",
                entities: [User, Counter],
                synchronize: true,
            });

            await dataSource.initialize();

            const userRepository = dataSource.getRepository(User);

            try {
                await dataSource.transaction(async manager => {
                    await manager.save(new User("Rollback Test", 100));
                    throw new Error("Simulated error");
                });
            } catch (e) {
                // Expected error
            }

            const user = await userRepository.findOne({where: {name: "Rollback Test"}});
            assert.strictEqual(user, null);

            await dataSource.destroy();
        });
    });

    describe("Metadata & Introspection", () => {
        test("should have access to entity metadata", async () => {
            const dataSource = new DataSource({
                type: "postgres",
                host: "localhost",
                port: 5435,
                username: "postgres",
                password: "postgres",
                database: "test",
                entities: [User, Counter],
                synchronize: true,
            });

            await dataSource.initialize();

            const metadata = dataSource.getMetadata(User);
            assert.ok(metadata);
            assert.strictEqual(metadata.name, "User");

            const columns = metadata.columns;
            assert.ok(Array.isArray(columns));
            assert.ok(columns.length > 0);

            await dataSource.destroy();
        });

        test("should inspect column metadata", async () => {
            const dataSource = new DataSource({
                type: "postgres",
                host: "localhost",
                port: 5435,
                username: "postgres",
                password: "postgres",
                database: "test",
                entities: [User, Counter],
                synchronize: true,
            });

            await dataSource.initialize();

            const metadata = dataSource.getMetadata(User);
            const nameColumn = metadata.findColumnWithPropertyName("name");
            const moneyColumn = metadata.findColumnWithPropertyName("money");

            assert.ok(nameColumn);
            assert.ok(moneyColumn);

            assert.strictEqual(nameColumn.propertyName, "name");
            assert.strictEqual(moneyColumn.propertyName, "money");

            await dataSource.destroy();
        });

        test("should get primary columns", async () => {
            const dataSource = new DataSource({
                type: "postgres",
                host: "localhost",
                port: 5435,
                username: "postgres",
                password: "postgres",
                database: "test",
                entities: [User, Counter],
                synchronize: true,
            });

            await dataSource.initialize();

            const metadata = dataSource.getMetadata(User);
            const primaryColumns = metadata.primaryColumns;

            assert.ok(Array.isArray(primaryColumns));
            assert.ok(primaryColumns.length > 0);

            await dataSource.destroy();
        });

        test("should get relations metadata if exists", async () => {
            const dataSource = new DataSource({
                type: "postgres",
                host: "localhost",
                port: 5435,
                username: "postgres",
                password: "postgres",
                database: "test",
                entities: [User, Counter],
                synchronize: true,
            });

            await dataSource.initialize();

            const metadata = dataSource.getMetadata(User);
            const relations = metadata.relations;

            assert.ok(Array.isArray(relations));

            await dataSource.destroy();
        });
    });

    describe("Query Runner", () => {
        test("should execute raw queries", async () => {
            const dataSource = new DataSource({
                type: "postgres",
                host: "localhost",
                port: 5435,
                username: "postgres",
                password: "postgres",
                database: "test",
                entities: [User, Counter],
                synchronize: true,
            });

            await dataSource.initialize();

            const queryRunner = dataSource.createQueryRunner();

            const result = await queryRunner.query(`SELECT 1 as value`);
            assert.ok(result);
            assert.ok(result.length > 0);

            await queryRunner.release();
            await dataSource.destroy();
        });

        test("should get table information", async () => {
            const dataSource = new DataSource({
                type: "postgres",
                host: "localhost",
                port: 5435,
                username: "postgres",
                password: "postgres",
                database: "test",
                entities: [User, Counter],
                synchronize: true,
            });

            await dataSource.initialize();

            const queryRunner = dataSource.createQueryRunner();
            const tables = await queryRunner.getTables();

            assert.ok(Array.isArray(tables));
            assert.ok(tables.length > 0);

            const userTable = tables.find(t => t.name.includes("user"));
            assert.ok(userTable);

            await queryRunner.release();
            await dataSource.destroy();
        });
    });

    describe("Database Cleanup", () => {
        test("should clear entity data", async () => {
            const dataSource = new DataSource({
                type: "postgres",
                host: "localhost",
                port: 5435,
                username: "postgres",
                password: "postgres",
                database: "test",
                entities: [User, Counter],
                synchronize: true,
            });

            await dataSource.initialize();

            const userRepository = dataSource.getRepository(User);
            await userRepository.save(new User("User 1", 100));
            await userRepository.save(new User("User 2", 200));

            let count = await userRepository.count();
            assert.strictEqual(count, 2);

            const manager = dataSource.createEntityManager();
            await manager.clear(User);

            count = await userRepository.count();
            assert.strictEqual(count, 0);

            await dataSource.destroy();
        });

        test("should use truncate for cleanup", async () => {
            const dataSource = new DataSource({
                type: "postgres",
                host: "localhost",
                port: 5435,
                username: "postgres",
                password: "postgres",
                database: "test",
                entities: [User, Counter],
                synchronize: true,
            });

            await dataSource.initialize();

            const userRepository = dataSource.getRepository(User);
            await userRepository.save(new User("Truncate Test", 100));

            const queryRunner = dataSource.createQueryRunner();
            await queryRunner.clearTable("users");

            const count = await userRepository.count();
            assert.strictEqual(count, 0);

            await queryRunner.release();
            await dataSource.destroy();
        });
    });
});
