/**
 * Framework-Native Integration Tests for Persistence
 *
 * These tests demonstrate how to use the node-boot framework's persistence
 * features for integration testing without manual database setup.
 *
 * Key patterns:
 * 1. Simple setup via test utilities
 * 2. Access components from DI container
 * 3. Repository pattern for clean code
 * 4. Service integration pattern
 *
 * @author Manuel Santos
 */
import {describe, test, before, after, afterEach} from "node:test";
import * as assert from "node:assert";
import "reflect-metadata";
import {Container} from "typedi";
import {DataSource} from "typeorm";
import {initializePersistence, clearAllTestData} from "./test-utils";
import {User} from "./postgres/entities/User.entity";
import {UserRepository} from "./postgres/repositories/user.repository";

/**
 * Framework-Native Repository Operations Tests
 *
 * These tests showcase the recommended integration testing pattern:
 * 1. Initialize persistence with DataSource
 * 2. Create repository instances
 * 3. Test repository methods
 * 4. Verify database state
 *
 * The repository pattern allows for:
 * - Clean separation of data access logic
 * - Easy testing of custom repository methods
 * - Reusability across services
 */
describe("Framework-Native Integration Tests - Repository Pattern", () => {
    let dataSource: DataSource;
    let userRepository: UserRepository;

    before(async () => {
        // Initialize persistence with test database
        const setup = await initializePersistence();
        dataSource = setup.dataSource;

        // Create custom repository (framework-style)
        // In production, these would be injected via DI container
        userRepository = new UserRepository(dataSource);
    });

    after(async () => {
        await clearAllTestData(dataSource);
        if (dataSource.isInitialized) {
            await dataSource.destroy();
        }
        Container.remove(DataSource);
    });

    afterEach(async () => {
        // Clean test data between tests
        const manager = dataSource.createEntityManager();
        await manager.clear(User);
    });

    describe("Custom Repository Methods", () => {
        test("should create user using custom repository method", async () => {
            const user = await userRepository.createUser("Integration Test User", 250);

            assert.ok(user);
            assert.strictEqual(user.name, "Integration Test User");
            assert.strictEqual(user.money, 250);
        });

        test("should find user by name using custom repository method", async () => {
            await userRepository.createUser("Search Target", 300);

            const user = await userRepository.findUserByName("Search Target");
            assert.ok(user);
            assert.strictEqual(user.money, 300);
        });

        test("should return null when user not found", async () => {
            const user = await userRepository.findUserByName("Non Existent User");
            assert.strictEqual(user, null);
        });

        test("should support inherited TypeORM methods on custom repository", async () => {
            await userRepository.createUser("User A", 100);
            await userRepository.createUser("User B", 200);

            const count = await userRepository.count();
            assert.strictEqual(count, 2);

            const users = await userRepository.find();
            assert.strictEqual(users.length, 2);
        });

        test("should support query builder on custom repository", async () => {
            await userRepository.createUser("Rich User", 1000);
            await userRepository.createUser("Poor User", 10);

            const wealthy = await userRepository
                .createQueryBuilder("u")
                .where("u.money > :threshold", {threshold: 500})
                .getMany();

            assert.strictEqual(wealthy.length, 1);
            assert.strictEqual(wealthy[0].name, "Rich User");
        });

        test("should support ordering in custom repository", async () => {
            await userRepository.createUser("First", 100);
            await userRepository.createUser("Second", 200);
            await userRepository.createUser("Third", 300);

            const ordered = await userRepository.createQueryBuilder("u").orderBy("u.money", "DESC").getMany();

            assert.strictEqual(ordered[0].name, "Third");
            assert.strictEqual(ordered[1].name, "Second");
            assert.strictEqual(ordered[2].name, "First");
        });
    });

    describe("TypeORM Repository via DataSource", () => {
        test("should perform CRUD operations via dataSource repository", async () => {
            const repo = dataSource.getRepository(User);

            // Create
            const user = new User("CRUD Test", 400);
            const saved = await repo.save(user);
            assert.ok(saved);

            // Read
            const found = await repo.findOne({where: {name: "CRUD Test"}});
            assert.strictEqual(found?.money, 400);

            // Update
            found!.money = 500;
            await repo.save(found!);

            // Verify update
            const updated = await repo.findOne({where: {name: "CRUD Test"}});
            assert.strictEqual(updated?.money, 500);

            // Delete
            await repo.remove(found!);
            const deleted = await repo.findOne({where: {name: "CRUD Test"}});
            assert.strictEqual(deleted, null);
        });

        test("should bulk insert via dataSource repository", async () => {
            const repo = dataSource.getRepository(User);

            const users = [new User("Bulk 1", 100), new User("Bulk 2", 200), new User("Bulk 3", 300)];

            await repo.save(users);

            const count = await repo.count();
            assert.strictEqual(count, 3);
        });

        test("should find with conditions via query builder", async () => {
            const repo = dataSource.getRepository(User);

            await repo.save(new User("Rich", 1000));
            await repo.save(new User("Poor", 100));

            const rich = await repo.createQueryBuilder("u").where("u.money > :min", {min: 500}).getMany();

            assert.strictEqual(rich.length, 1);
        });

        test("should check existence via exist method", async () => {
            const repo = dataSource.getRepository(User);

            await repo.save(new User("Exists", 100));

            const exists = await repo.exist({where: {name: "Exists"}});
            assert.strictEqual(exists, true);

            const notExists = await repo.exist({where: {name: "DoesNotExist"}});
            assert.strictEqual(notExists, false);
        });

        test("should count records", async () => {
            const repo = dataSource.getRepository(User);

            await repo.save(new User("Count1", 100));
            await repo.save(new User("Count2", 200));

            const count = await repo.count();
            assert.strictEqual(count, 2);
        });
    });

    describe("Transactions", () => {
        test("should successfully commit transaction", async () => {
            const repo = dataSource.getRepository(User);

            await dataSource.transaction(async manager => {
                await manager.save(new User("Transaction1", 100));
                await manager.save(new User("Transaction2", 200));
            });

            const count = await repo.count();
            assert.strictEqual(count, 2);
        });

        test("should rollback on error in transaction", async () => {
            const repo = dataSource.getRepository(User);

            try {
                await dataSource.transaction(async manager => {
                    await manager.save(new User("Rollback Test", 100));
                    throw new Error("Simulated error");
                });
            } catch (e) {
                // Expected error
            }

            // Verify rollback
            const count = await repo.count();
            assert.strictEqual(count, 0);

            const user = await repo.findOne({where: {name: "Rollback Test"}});
            assert.strictEqual(user, null);
        });

        test("should support nested transaction handling", async () => {
            const repo = dataSource.getRepository(User);

            await dataSource.transaction(async manager => {
                await manager.save(new User("Outer1", 100));

                try {
                    await dataSource.transaction(async nestedManager => {
                        await nestedManager.save(new User("Inner1", 200));
                        throw new Error("Inner error");
                    });
                } catch (e) {
                    // Inner transaction rolled back
                }

                // Outer transaction continues
                await manager.save(new User("Outer2", 300));
            });

            // Verify: Inner transaction was rolled back, Outer was committed
            const outer1 = await repo.findOne({where: {name: "Outer1"}});
            const outer2 = await repo.findOne({where: {name: "Outer2"}});
            const inner1 = await repo.findOne({where: {name: "Inner1"}});

            assert.ok(outer1);
            assert.ok(outer2);
            assert.strictEqual(inner1, null);
        });
    });

    describe("Query Builder Operations", () => {
        test("should update multiple records with query builder", async () => {
            const repo = dataSource.getRepository(User);

            await repo.save([new User("Update1", 100), new User("Update2", 100), new User("Unchanged", 200)]);

            await repo
                .createQueryBuilder()
                .update(User)
                .set({money: 500})
                .where("money = :target", {target: 100})
                .execute();

            const updated = await repo.find({where: {money: 500}});
            assert.strictEqual(updated.length, 2);
        });

        test("should delete multiple records with query builder", async () => {
            const repo = dataSource.getRepository(User);

            await repo.save([new User("Delete1", 100), new User("Delete2", 100), new User("Keep", 200)]);

            await repo.createQueryBuilder().delete().where("money = :target", {target: 100}).execute();

            const remaining = await repo.find();
            assert.strictEqual(remaining.length, 1);
            assert.strictEqual(remaining[0].name, "Keep");
        });

        test("should use advanced query builder features", async () => {
            const repo = dataSource.getRepository(User);

            await repo.save([
                new User("Alice", 500),
                new User("Bob", 300),
                new User("Charlie", 700),
                new User("Diana", 200),
            ]);

            const result = await repo
                .createQueryBuilder("u")
                .where("u.money > :min", {min: 250})
                .orderBy("u.money", "DESC")
                .limit(2)
                .getMany();

            assert.strictEqual(result.length, 2);
            assert.strictEqual(result[0].name, "Charlie");
            assert.strictEqual(result[1].name, "Alice");
        });
    });

    describe("Entity Manager Operations", () => {
        test("should perform operations via entity manager", async () => {
            const manager = dataSource.createEntityManager();

            const user = new User("EM User", 350);
            await manager.save(user);

            const found = await manager.findOne(User, {where: {name: "EM User"}});
            assert.ok(found);
            assert.strictEqual(found.money, 350);
        });

        test("should use entity manager for transactions", async () => {
            const manager = dataSource.createEntityManager();

            await manager.transaction(async transactionalMgr => {
                await transactionalMgr.save(new User("EMTransaction", 400));
            });

            const found = await manager.findOne(User, {where: {name: "EMTransaction"}});
            assert.ok(found);
        });

        test("should clear entity data", async () => {
            const manager = dataSource.createEntityManager();
            const repo = dataSource.getRepository(User);

            await repo.save([new User("Clear1", 100), new User("Clear2", 200)]);

            let count = await repo.count();
            assert.strictEqual(count, 2);

            await manager.clear(User);

            count = await repo.count();
            assert.strictEqual(count, 0);
        });
    });

    describe("Metadata & Introspection", () => {
        test("should access entity metadata", async () => {
            const metadata = dataSource.getMetadata(User);

            assert.ok(metadata);
            assert.strictEqual(metadata.name, "User");

            const columns = metadata.columns;
            assert.ok(Array.isArray(columns));
            assert.ok(columns.length > 0);
        });

        test("should inspect column metadata", async () => {
            const metadata = dataSource.getMetadata(User);

            const nameColumn = metadata.findColumnWithPropertyName("name");
            const moneyColumn = metadata.findColumnWithPropertyName("money");

            assert.ok(nameColumn);
            assert.ok(moneyColumn);

            assert.strictEqual(nameColumn.propertyName, "name");
            assert.strictEqual(moneyColumn.propertyName, "money");
        });

        test("should get table information", async () => {
            const queryRunner = dataSource.createQueryRunner();

            try {
                const tables = await queryRunner.getTables();
                assert.ok(Array.isArray(tables));
                assert.ok(tables.length > 0);

                const userTable = tables.find(t => t.name.toLowerCase().includes("user"));
                assert.ok(userTable);
            } finally {
                await queryRunner.release();
            }
        });
    });
});

/**
 * Service Integration Pattern
 *
 * This demonstrates how to test services that depend on repositories.
 * The pattern shows:
 * 1. Repository injection
 * 2. Service business logic
 * 3. Integration testing
 */
describe("Service Integration - Business Logic Testing", () => {
    let dataSource: DataSource;
    let userRepository: UserRepository;

    before(async () => {
        const setup = await initializePersistence();
        dataSource = setup.dataSource;
        userRepository = new UserRepository(dataSource);
    });

    after(async () => {
        await clearAllTestData(dataSource);
        if (dataSource.isInitialized) {
            await dataSource.destroy();
        }
        Container.remove(DataSource);
    });

    afterEach(async () => {
        const manager = dataSource.createEntityManager();
        await manager.clear(User);
    });

    test("should support repository injection pattern", async () => {
        // In real services, repositories would be injected
        // This test shows the pattern

        // Service-like operation
        const user = await userRepository.createUser("Service Pattern Test", 450);
        assert.ok(user);

        // Verify via database
        const found = await userRepository.findUserByName("Service Pattern Test");
        assert.strictEqual(found?.money, 450);
    });

    test("should support complex queries from service layer", async () => {
        // Setup test data
        await userRepository.createUser("User1", 100);
        await userRepository.createUser("User2", 500);
        await userRepository.createUser("User3", 1000);

        // Service-like query method
        const wealthy = await userRepository
            .createQueryBuilder("u")
            .where("u.money >= :threshold", {threshold: 500})
            .orderBy("u.money", "DESC")
            .getMany();

        assert.strictEqual(wealthy.length, 2);
        assert.strictEqual(wealthy[0].name, "User3");
        assert.strictEqual(wealthy[1].name, "User2");
    });

    test("should support transactional service operations", async () => {
        const repo = dataSource.getRepository(User);

        // Service-like transactional operation
        const result = await dataSource.transaction(async manager => {
            const user1 = new User("Service User 1", 200);
            const user2 = new User("Service User 2", 300);

            await manager.save([user1, user2]);

            return {
                user1Name: user1.name,
                user2Name: user2.name,
                total: 500,
            };
        });

        assert.strictEqual(result.total, 500);

        const count = await repo.count();
        assert.strictEqual(count, 2);
    });
});
