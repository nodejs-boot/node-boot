/**
 * Framework-Native Integration Tests - Query Builder Operations
 *
 * Verifies bulk update/delete and advanced filtering/sorting/limiting via
 * TypeORM's query builder.
 *
 * @author Manuel Santos
 */
import {describe, test, before, after, afterEach} from "node:test";
import * as assert from "node:assert";
import "reflect-metadata";
import {DataSource} from "typeorm";
import {initializePersistence, clearAllTestData} from "./test-utils";
import {User} from "./setup/postgres.setup";

describe("Framework-Native Integration Tests - Query Builder Operations", () => {
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
        assert.strictEqual(remaining[0]!.name, "Keep");
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
        assert.strictEqual(result[0]!.name, "Charlie");
        assert.strictEqual(result[1]!.name, "Alice");
    });
});
