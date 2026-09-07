import "reflect-metadata";
import {Container} from "typedi";
import {ApplicationContext, JsonObject} from "@nodeboot/context";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableDI} from "@nodeboot/di";
import {GhostServer} from "@nodeboot/ghost-server";
import {HTTP_CLIENT_FEATURE} from "../../src";

// Side-effect import: `@HttpClient(...)` self-registers an `HttpClientAdapter` into
// `ApplicationContext` on module load, so no `@EnableComponentScan()` is needed for this fixture.
import "./DisabledHttpClient";

/**
 * Deliberately does NOT apply `@EnableHttpClients()`. Contrasted against `HttpClientEnabledApp`,
 * which is identical except for that one decorator.
 */
@EnableDI(Container)
@NodeBootApplication()
export class HttpClientDisabledApp implements NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView> {
        // `applicationFeatures[HTTP_CLIENT_FEATURE]` is a process-wide flag with no per-app scoping
        // and no reset - if `HttpClientEnabledApp` (a different file, but the same test process)
        // has already booted and flipped it on, it would otherwise leak into this "disabled"
        // scenario and silently invalidate it. Force it off so this fixture faithfully represents
        // an app that never applied `@EnableHttpClients()`, regardless of what other test files in
        // this run have done.
        delete ApplicationContext.get().applicationFeatures[HTTP_CLIENT_FEATURE];
        return NodeBoot.run(GhostServer, additionalConfig);
    }
}
