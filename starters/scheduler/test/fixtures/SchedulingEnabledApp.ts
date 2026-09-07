import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableDI} from "@nodeboot/di";
import {JsonObject} from "@nodeboot/context";
import {GhostServer} from "@nodeboot/ghost-server";
import {EnableScheduling} from "../../src";

// Side-effect import: the `@Scheduler`-decorated method self-registers a `SchedulerAdapter` into
// `ApplicationContext` on module load, so no `@EnableComponentScan()` is needed for this fixture.
import "./EnabledCounterService";

/**
 * Boots with `@EnableScheduling()`. `GhostServer` is used because scheduling needs DI + the
 * application lifecycle, not an HTTP transport - see `nodeboot-server-ghost`.
 */
@EnableDI(Container)
@EnableScheduling()
@NodeBootApplication()
export class SchedulingEnabledApp implements NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView> {
        return NodeBoot.run(GhostServer, additionalConfig);
    }
}
