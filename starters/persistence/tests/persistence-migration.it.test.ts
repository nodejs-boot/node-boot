/**
 * Auto-configuration integration test for `@nodeboot/starter-persistence`'s `@Migration`.
 *
 * Kept separate from `persistence-decorators.it.test.ts` because `synchronize` and `migrationsRun`
 * are mutually exclusive on the same TypeORM datasource - proving a migration actually ran requires
 * `synchronize: false`, so entity metadata sync can't be the thing that created the table instead.
 */
import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {DataSource} from "typeorm";
import {useNodeBoot} from "@nodeboot/node-test";
import {MigrationApp} from "./fixtures/MigrationApp";
import {AuditLogRepository} from "./fixtures/AuditLogRepository";

describe("@nodeboot/starter-persistence auto-configuration - @Migration applied", () => {
    // `@nodeboot/node-test` resolves `NodeBootApp` against its own (published) `@nodeboot/core`
    // dependency, which TypeScript treats as nominally distinct from this monorepo's workspace
    // package of the same name - cast at the boundary rather than relaxing the fixture's typing.
    useNodeBoot(MigrationApp as any, ({useConfig}) => {
        useConfig({
            app: {name: "starter-persistence-migration-test"},
            persistence: {
                type: "better-sqlite3",
                "better-sqlite3": {database: ":memory:", synchronize: false, migrationsRun: true},
            },
        });
    });

    test("the migration actually ran and created the table (synchronize is off)", async () => {
        // `useNodeBoot()` doesn't return control to the test body until the app has fully booted
        // (including running migrations), so the repository/table are already there - no manual
        // polling needed.
        //
        // `@nodeboot/node-test`'s own `useRepository()`/`useService()` resolve against a different
        // (published) `ApplicationContext` singleton than this workspace's real running app - see
        // `nodeboot-test-framework`. Retrieve straight from `typedi`'s Container.
        const dataSource = Container.get(DataSource);

        const tables: Array<{name: string}> = await dataSource.query(
            "SELECT name FROM sqlite_master WHERE type = 'table'",
        );
        assert.ok(tables.some(t => t.name === "audit_log"));

        const appliedMigrations: Array<{name: string}> = await dataSource.query("SELECT name FROM migrations");
        assert.ok(appliedMigrations.some(m => m.name === "CreateAuditLogTable1735600000000"));
    });

    test("the migration-created table is fully usable through @DataRepository", async () => {
        const repository = Container.get(AuditLogRepository);

        const saved = await repository.save(repository.create({action: "user.created"}));
        assert.ok(saved.id);

        const found = await repository.findOneBy({id: saved.id});
        assert.equal(found?.action, "user.created");
    });
});
