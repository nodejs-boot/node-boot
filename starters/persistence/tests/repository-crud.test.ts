/**
 * Framework-Native Integration Tests - TypeORM Repository via DataSource
 *
 * Verifies plain TypeORM repository CRUD, bulk operations, existence checks,
 * and counting when obtained directly from the DataSource (no custom
 * repository subclass involved).
 *
 * @author Manuel Santos
 */
import {describe, test, before, after, afterEach} from "node:test";
import * as assert from "node:assert";
import "reflect-metadata";
import {DataSource} from "typeorm";
import {initializePersistence, clearAllTestData} from "./test-utils";
import {User} from "./setup/postgres.setup";

describe("Framework-Native Integration Tests - TypeORM Repository via DataSource", () => {
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

        const exists = await repo.exists({where: {name: "Exists"}});
        assert.strictEqual(exists, true);

        const notExists = await repo.exists({where: {name: "DoesNotExist"}});
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
