/**
 * Framework-Native Integration Tests - Service Integration (Business Logic)
 *
 * Demonstrates testing services that depend on repositories: repository
 * injection, complex service-level queries, and transactional service
 * operations.
 *
 * @author Manuel Santos
 */
import {describe, test, before, after, afterEach} from "node:test";
import * as assert from "node:assert";
import "reflect-metadata";
import {DataSource} from "typeorm";
import {initializePersistence, clearAllTestData} from "./test-utils";
import {User, UserRepository} from "./setup/postgres.setup";

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
        assert.strictEqual(wealthy[0]!.name, "User3");
        assert.strictEqual(wealthy[1]!.name, "User2");
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
