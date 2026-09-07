/**
 * Auto-configuration integration test for `@nodeboot/starter-persistence`.
 *
 * Every other test in this package (`repository-operations.test.ts`,
 * `tests/framework/*.test.ts`, `postgres-transaction.test.ts`, `mongodb-transaction.test.ts`, ...)
 * constructs a plain TypeORM `DataSource` directly via `initializePersistence()` in
 * `test-utils.ts`, bypassing Node-Boot's bootstrap entirely. That's the right tool for exercising
 * TypeORM/repository behavior against a real driver, but none of it proves that
 * `@EnableRepositories()` + `@DataRepository(...)` actually autowire into a *running* Node-Boot
 * application - that the `@Configuration`/`@Bean` chain (`DataSourceConfiguration` →
 * `PersistenceConfiguration` → `DefaultRepositoriesAdapter`) really produces a working, DI-resolved
 * repository when a real app boots.
 *
 * This boots a real Node-Boot app (via `@nodeboot/node-test`'s `useNodeBoot`, on `GhostServer` -
 * persistence needs no HTTP transport) with `@EnableRepositories()` against an in-memory
 * `better-sqlite3` datasource (the `nodeboot-test-sql` "fast path" - no Docker required), and
 * drives a `@DataRepository`-decorated repository resolved straight from the real DI container.
 */
import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {useNodeBoot} from "@nodeboot/node-test";
import {PersistenceEnabledApp} from "./fixtures/PersistenceEnabledApp";
import {CounterRepository} from "./fixtures/CounterRepository";

describe("@nodeboot/starter-persistence auto-configuration - @EnableRepositories() applied", () => {
    // `@nodeboot/node-test` resolves `NodeBootApp` against its own (published) `@nodeboot/core`
    // dependency, which TypeScript treats as nominally distinct from this monorepo's workspace
    // package of the same name - cast at the boundary rather than relaxing the fixture's typing.
    useNodeBoot(PersistenceEnabledApp as any, ({useConfig}) => {
        useConfig({
            app: {name: "starter-persistence-enabled-test"},
            persistence: {
                type: "better-sqlite3",
                // `DataSourceConfiguration.dataSourceConfig()` reads `synchronize`/`migrationsRun`
                // off `persistence[type]` (the dialect-specific sub-object), not off `persistence`
                // itself - it must live here, not as a sibling of `type`.
                "better-sqlite3": {database: ":memory:", synchronize: true},
            },
        });
    });

    test("auto-configures a real DataSource and binds @DataRepository into the DI container", async () => {
        // `useNodeBoot()` doesn't return control to the test body until the app has fully booted
        // (including `persistence.started`/`application.adapters.bound`), so by this point
        // `PersistenceConfiguration.dataSource()`'s background `DataSource.initialize().then(...)`
        // chain has already run and bound the repository - no manual polling needed.
        //
        // `@nodeboot/node-test`'s own `useRepository()`/`useService()` resolve against a different
        // (published) `ApplicationContext` singleton than this workspace's real running app - see
        // `nodeboot-test-framework`. Retrieve straight from `typedi`'s Container, the one
        // `@EnableDI(Container)` actually wired the repository into.
        const repository = Container.get(CounterRepository);

        const saved = await repository.save(repository.create({label: "widgets", value: 3}));
        assert.ok(saved.id);

        const found = await repository.findOneBy({id: saved.id});
        assert.equal(found?.label, "widgets");
        assert.equal(found?.value, 3);

        assert.equal(await repository.count(), 1);
    });
});
