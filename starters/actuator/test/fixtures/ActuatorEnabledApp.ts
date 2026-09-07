import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableDI} from "@nodeboot/di";
import {JsonObject} from "@nodeboot/context";
import {HttpServer} from "@nodeboot/http-server";
import {EnableActuator} from "../../src";

/**
 * Boots with `@EnableActuator()`. A real HTTP server (`@nodeboot/http-server`) is required here,
 * unlike the DI-only starters tested elsewhere - actuator endpoints are exposed over actual routes
 * (`/actuator/health`, ...), which is the whole point of what's being proven.
 */
@EnableDI(Container)
@EnableActuator()
@NodeBootApplication()
export class ActuatorEnabledApp implements NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView> {
        return NodeBoot.run(HttpServer, additionalConfig);
    }
}
