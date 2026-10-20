import "reflect-metadata";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {JsonObject} from "@nodeboot/context";
import {HttpServer} from "@nodeboot/http-server";
import {EnableActuator} from "../../src";

/**
 * Boots with `@EnableActuator()`. A real HTTP server (`@nodeboot/http-server`) is required here,
 * unlike the DI-only starters tested elsewhere - actuator endpoints are exposed over actual routes
 * (`/actuator/health`, ...), which is the whole point of what's being proven.
 */
@EnableActuator()
@NodeBootApplication()
export class ActuatorEnabledApp implements NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView> {
        return NodeBoot.run(HttpServer, additionalConfig);
    }
}
