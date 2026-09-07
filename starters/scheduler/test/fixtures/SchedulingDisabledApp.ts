import "reflect-metadata";
import {Container} from "typedi";
import {ApplicationContext, JsonObject} from "@nodeboot/context";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableDI} from "@nodeboot/di";
import {GhostServer} from "@nodeboot/ghost-server";
import {SCHEDULING_FEATURE} from "../../src/types";

// Side-effect import: the `@Scheduler`-decorated method self-registers a `SchedulerAdapter` into
// `ApplicationContext` on module load, so no `@EnableComponentScan()` is needed for this fixture.
import "./DisabledCounterService";

/**
 * Deliberately does NOT apply `@EnableScheduling()`. Contrasted against `SchedulingEnabledApp`,
 * which is identical except for that one decorator.
 */
@EnableDI(Container)
@NodeBootApplication()
export class SchedulingDisabledApp implements NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView> {
        // `applicationFeatures[SCHEDULING_FEATURE]` is a process-wide flag with no per-app scoping
        // and no reset - if `SchedulingEnabledApp` (a different file, but the same test process) has
        // already booted and flipped it on, it would otherwise leak into this "disabled" scenario and
        // silently invalidate it. Force it off so this fixture faithfully represents an app that never
        // applied `@EnableScheduling()`, regardless of what other test files in this run have done.
        delete ApplicationContext.get().applicationFeatures[SCHEDULING_FEATURE];
        return NodeBoot.run(GhostServer, additionalConfig);
    }
}
