/**
 * Auto-configuration integration test for the persistence starter's decorators.
 *
 * `persistence-decorators.test.ts` (no `.it.`) proves each decorator's own metadata/registration
 * logic in isolation, with no live database. This file proves they actually take effect once wired
 * into a *running* Node-Boot application: `@DataRepository`, `@EntityEventSubscriber`,
 * `@PersistenceNamingStrategy`, `@PersistenceCache`, and `@Transactional` together, against a real
 * in-memory `better-sqlite3` datasource (see `nodeboot-test-sql`'s fast path - no Docker required).
 *
 * `@Migration` is covered separately in `persistence-migration.it.test.ts`, since `synchronize` and
 * `migrationsRun` are mutually exclusive on the same datasource.
 */
import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {DataSource} from "typeorm";
import {useNodeBoot} from "@nodeboot/node-test";
import {ComprehensivePersistenceApp} from "./fixtures/ComprehensivePersistenceApp";
import {ProductRepository} from "./fixtures/ProductRepository";
import {ProductService} from "./fixtures/ProductService";
import {subscriberEvents} from "./fixtures/ProductSubscriber";
import {cacheEvents} from "./fixtures/TrackingQueryCache";

describe("@nodeboot/starter-persistence auto-configuration - decorators against a real app", () => {
    // `@nodeboot/node-test` resolves `NodeBootApp` against its own (published) `@nodeboot/core`
    // dependency, which TypeScript treats as nominally distinct from this monorepo's workspace
    // package of the same name - cast at the boundary rather than relaxing the fixture's typing.
    useNodeBoot(ComprehensivePersistenceApp as any, ({useConfig}) => {
        useConfig({
            app: {name: "starter-persistence-decorators-test"},
            persistence: {
                type: "better-sqlite3",
                cache: true,
                // `database`/`synchronize` must live under the dialect key, not as a sibling of
                // `type` - see `nodeboot-test-sql`.
                "better-sqlite3": {database: ":memory:", synchronize: true},
            },
        });
    });

    test("@DataRepository resolves a working repository from the real DI container", async () => {
        // `useNodeBoot()` doesn't return control to the test body until the app has fully booted
        // (including `persistence.started`), so `@DataRepository` is already bound by this point -
        // no manual polling needed.
        //
        // `@nodeboot/node-test`'s own `useRepository()`/`useService()` resolve against a different
        // (published) `ApplicationContext` singleton than this workspace's real running app - see
        // `nodeboot-test-framework`. Retrieve straight from `typedi`'s Container, the one
        // `@EnableDI(Container)` actually wired the repository into.
        const repository = Container.get(ProductRepository);

        const saved = await repository.save(repository.create({name: "Widget", version: 1}));
        assert.ok(saved.id);

        const found = await repository.findOneBy({id: saved.id});
        assert.equal(found?.name, "Widget");
    });

    test("@EntityEventSubscriber fires beforeInsert/afterInsert for the real save above", () => {
        assert.ok(subscriberEvents.includes("beforeInsert:Widget"));
        assert.ok(subscriberEvents.includes("afterInsert:Widget"));
    });

    test("@PersistenceNamingStrategy renames the real sqlite table to 'nb_product'", async () => {
        const dataSource = Container.get(DataSource);

        const tables: Array<{name: string}> = await dataSource.query(
            "SELECT name FROM sqlite_master WHERE type = 'table'",
        );
        const tableNames = tables.map(t => t.name);

        assert.ok(tableNames.includes("nb_product"), `expected 'nb_product' among tables: ${tableNames.join(", ")}`);
        assert.ok(!tableNames.includes("product"), `did not expect a default-named 'product' table`);
    });

    test("@PersistenceCache wires a custom QueryResultCache that TypeORM actually calls", async () => {
        // `connect()` is called once, synchronously as part of DataSource initialization - its
        // presence alone proves the custom provider from `@PersistenceCache()` is the one TypeORM
        // is using, not its own default database-table cache.
        assert.ok(cacheEvents.includes("connect"));

        const repository = Container.get(ProductRepository);
        const cacheId = "product-cache-key";

        await repository.createQueryBuilder("product").cache(cacheId, 60_000).getMany();
        await repository.createQueryBuilder("product").cache(cacheId, 60_000).getMany();

        assert.ok(cacheEvents.some(event => event === `store:${cacheId}`));
        assert.ok(cacheEvents.some(event => event === `get:${cacheId}`));
    });

    test("@Transactional commits every write performed inside a successful method call", async () => {
        const productService = Container.get(ProductService);
        const repository = Container.get(ProductRepository);

        await productService.createProduct("Committed Widget");

        const found = await repository.findOneBy({name: "Committed Widget"});
        assert.ok(found, "expected the product saved inside @Transactional to be committed");
    });

    test("@Transactional rolls back every write when the method throws", async () => {
        const productService = Container.get(ProductService);
        const repository = Container.get(ProductRepository);

        await assert.rejects(
            () => productService.createTwoProductsThenFail("Rollback A", "Rollback B"),
            /boom - forcing rollback/,
        );

        const foundA = await repository.findOneBy({name: "Rollback A"});
        const foundB = await repository.findOneBy({name: "Rollback B"});
        assert.equal(foundA, null, "expected the first write to have been rolled back");
        assert.equal(foundB, null, "expected the second write to have been rolled back");
    });
});
