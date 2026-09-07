/**
 * Framework-Native Integration Tests - Metadata & Introspection
 *
 * Verifies access to TypeORM's entity/column metadata and low-level schema
 * introspection via a `QueryRunner`.
 *
 * @author Manuel Santos
 */
import {describe, test, before, after} from "node:test";
import * as assert from "node:assert";
import "reflect-metadata";
import {DataSource} from "typeorm";
import {initializePersistence, clearAllTestData} from "./test-utils";
import {User} from "./setup/postgres.setup";

describe("Framework-Native Integration Tests - Metadata & Introspection", () => {
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
