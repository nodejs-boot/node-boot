import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableDI} from "@nodeboot/di";
import {JsonObject} from "@nodeboot/context";
import {GhostServer} from "@nodeboot/ghost-server";
import {EnableRepositories} from "../../src";
import {PersistenceContext} from "../../src";

/**
 * Boots with `@EnableRepositories()` against `synchronize: false, migrationsRun: true` - the
 * `audit_log` table only exists because `CreateAuditLogTable`/`@Migration()` actually ran.
 *
 * `PersistenceContext` is a process-wide singleton with no per-app scoping, so it's reset here
 * before the migration/repository fixtures are (first) imported, isolating this app's datasource
 * from any repositories/migrations another test file's fixtures may have already registered.
 * This only needs to happen once, at the point this module first loads `AuditLogRepository`/
 * `CreateAuditLogTable` - re-`require()`-ing an already-loaded module is a no-op in Node, so this
 * reset must run before those imports, not after (a decorator's side effect can't be "undone" by
 * resetting the registry once it's already run).
 */
PersistenceContext.reset();
require("./AuditLogRepository");
require("./CreateAuditLogTable1735600000000.migration");

@EnableDI(Container)
@EnableRepositories()
@NodeBootApplication()
export class MigrationApp implements NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView> {
        return NodeBoot.run(GhostServer, additionalConfig);
    }
}
