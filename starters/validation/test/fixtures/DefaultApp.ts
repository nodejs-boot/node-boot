import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableDI} from "@nodeboot/di";
import {JsonObject} from "@nodeboot/context";
import {HttpServer} from "@nodeboot/http-server";

// Side-effect import: the controller self-registers into `ApplicationContext` on module load,
// so no `@EnableComponentScan()` is needed for this fixture.
import "./UsersController";

/**
 * Deliberately does NOT apply `@EnableValidations()`. Node-Boot still validates request bodies
 * by default (that default is owned by `@nodeboot/engine`, not this starter), but without this
 * starter enabled there is no `api.validations` config wiring, so `class-validator` runs with its
 * own defaults - e.g. unknown properties are neither stripped nor rejected. This app is the
 * baseline the "positive" `StrictApp` behavior is contrasted against.
 */
@EnableDI(Container)
@NodeBootApplication()
export class DefaultApp implements NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView> {
        return NodeBoot.run(HttpServer, additionalConfig);
    }
}
