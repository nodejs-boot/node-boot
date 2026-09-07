/**
 * Framework-Native Integration Tests - Transactions
 *
 * Verifies commit, rollback, and nested-transaction behavior using the raw
 * `DataSource.transaction()` API (as opposed to the `@Transactional()`
 * decorator, which is covered separately in postgres-transaction.test.ts).
 *
 * @author Manuel Santos
 */
import {describe, test, before, after, afterEach} from "node:test";
import * as assert from "node:assert";
import "reflect-metadata";
import {DataSource} from "typeorm";
import {initializePersistence, clearAllTestData} from "./test-utils";
import {User} from "./setup/postgres.setup";

describe("Framework-Native Integration Tests - Transactions", () => {
    let dataSource: DataSource;

    before(async () => {
        const setup = await initializePersistence();
        dataSource = setup.dataSource;
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
