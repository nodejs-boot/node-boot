/**
 * Framework-Native Integration Tests - Custom Repository Methods
 *
 * Verifies that a hand-written repository (extending TypeORM's `Repository<T>`)
 * behaves correctly both for its own custom methods and for inherited
 * TypeORM repository/query-builder behavior.
 *
 * @author Manuel Santos
 */
import {describe, test, before, after, afterEach} from "node:test";
import * as assert from "node:assert";
import "reflect-metadata";
import {DataSource} from "typeorm";
import {initializePersistence, clearAllTestData} from "./test-utils";
import {User, UserRepository} from "./setup/postgres.setup";

describe("Framework-Native Integration Tests - Custom Repository Methods", () => {
    let dataSource: DataSource;
    let userRepository: UserRepository;

    before(async () => {
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
    });

    afterEach(async () => {
        const manager = dataSource.createEntityManager();
        await manager.clear(User);
    });

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
        assert.strictEqual(wealthy[0]!.name, "Rich User");
    });

    test("should support ordering in custom repository", async () => {
        await userRepository.createUser("First", 100);
        await userRepository.createUser("Second", 200);
        await userRepository.createUser("Third", 300);

        const ordered = await userRepository.createQueryBuilder("u").orderBy("u.money", "DESC").getMany();

        assert.strictEqual(ordered[0]!.name, "Third");
        assert.strictEqual(ordered[1]!.name, "Second");
        assert.strictEqual(ordered[2]!.name, "First");
    });
});
