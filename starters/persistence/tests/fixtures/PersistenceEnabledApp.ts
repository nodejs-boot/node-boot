import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableDI} from "@nodeboot/di";
import {JsonObject} from "@nodeboot/context";
import {GhostServer} from "@nodeboot/ghost-server";
import {EnableRepositories} from "../../src";

// Side-effect import: `@DataRepository(...)` self-registers into `PersistenceContext` on module
// load, so no `@EnableComponentScan()` is needed for this fixture.
import "./CounterRepository";

/**
 * Boots with `@EnableRepositories()` against an in-memory `better-sqlite3` datasource - no Docker
 * required (see `nodeboot-test-sql`'s "fast path"). `GhostServer` is used because proving the
 * persistence layer autowires needs DI + the application lifecycle, not an HTTP transport.
 */
@EnableDI(Container)
@EnableRepositories()
@NodeBootApplication()
export class PersistenceEnabledApp implements NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView> {
        return NodeBoot.run(GhostServer, additionalConfig);
    }
}
