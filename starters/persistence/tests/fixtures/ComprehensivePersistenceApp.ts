import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableDI} from "@nodeboot/di";
import {JsonObject} from "@nodeboot/context";
import {GhostServer} from "@nodeboot/ghost-server";
import {EnableRepositories} from "../../src";

// Side-effect imports: each decorator below self-registers into `PersistenceContext` on module
// load, so no `@EnableComponentScan()` is needed for this fixture. `PersistenceContext` is a
// process-wide singleton with no per-app scoping, so its `repositories`/`eventSubscribers` end up
// accumulating registrations from every fixture file loaded anywhere in this test process (e.g.
// `PersistenceEnabledApp`'s unrelated `CounterRepository`) - harmless here since none of those
// other entities/subscribers conflict with this app's `Product`-based ones, and `synchronize`
// happily creates tables for all of them.
import "./ProductRepository";
import "./ProductSubscriber";
import "./ProductNamingStrategy";
import "./TrackingQueryCache";
import "./ProductService";

/**
 * Boots with `@EnableRepositories()` and exercises `@DataRepository`, `@EntityEventSubscriber`,
 * `@PersistenceNamingStrategy`, `@PersistenceCache`, and `@Transactional` together against an
 * in-memory `better-sqlite3` datasource (see `nodeboot-test-sql`'s fast path). `@Migration` is
 * covered separately in `MigrationApp`/`persistence-migration.it.test.ts`, since `synchronize` and
 * `migrationsRun` are mutually exclusive on the same datasource.
 */
@EnableDI(Container)
@EnableRepositories()
@NodeBootApplication()
export class ComprehensivePersistenceApp implements NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView> {
        return NodeBoot.run(GhostServer, additionalConfig);
    }
}
