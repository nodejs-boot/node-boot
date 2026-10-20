import "reflect-metadata";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {JsonObject} from "@nodeboot/context";
import {HttpServer} from "@nodeboot/http-server";
import {EnableOpenApi} from "../../src";

// Side-effect import: the controller self-registers into `ApplicationContext` on module load, so
// no `@EnableComponentScan()` is needed for this fixture.
import "./HelloController";

/**
 * Boots with `@EnableOpenApi()`. A real HTTP server (`@nodeboot/http-server`) is required here,
 * unlike the DI-only starters tested elsewhere - the OpenAPI spec is served over an actual route
 * (`/swagger.json`), which is the whole point of what's being proven.
 */
@EnableOpenApi()
@NodeBootApplication()
export class OpenApiEnabledApp implements NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView> {
        return NodeBoot.run(HttpServer, additionalConfig);
    }
}
