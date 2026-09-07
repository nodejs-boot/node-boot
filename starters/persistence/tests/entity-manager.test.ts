/**
 * Framework-Native Integration Tests - Entity Manager Operations
 *
 * Verifies save/find/transaction/clear operations performed directly through
 * a `DataSource`-created `EntityManager`, as an alternative to the
 * repository API.
 *
 * @author Manuel Santos
 */
import {describe, test, before, after, afterEach} from "node:test";
import * as assert from "node:assert";
import "reflect-metadata";
import {DataSource} from "typeorm";
import {initializePersistence, clearAllTestData} from "./test-utils";
import {User} from "./setup/postgres.setup";

describe("Framework-Native Integration Tests - Entity Manager Operations", () => {
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
