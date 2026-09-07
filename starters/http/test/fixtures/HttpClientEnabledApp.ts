import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableDI} from "@nodeboot/di";
import {JsonObject} from "@nodeboot/context";
import {GhostServer} from "@nodeboot/ghost-server";
import {EnableHttpClients} from "../../src";

// Side-effect import: `@HttpClient(...)` self-registers an `HttpClientAdapter` into
// `ApplicationContext` on module load, so no `@EnableComponentScan()` is needed for this fixture.
import "./EnabledHttpClient";

/**
 * Boots with `@EnableHttpClients()`. `GhostServer` is used because an outbound HTTP client needs
 * only DI + the application lifecycle, not an inbound HTTP transport - see `nodeboot-server-ghost`.
 */
@EnableDI(Container)
@EnableHttpClients()
@NodeBootApplication()
export class HttpClientEnabledApp implements NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView> {
        return NodeBoot.run(GhostServer, additionalConfig);
    }
}
