import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableDI} from "@nodeboot/di";
import {JsonObject} from "@nodeboot/context";
import {HttpServer} from "@nodeboot/http-server";
import {EnableValidations} from "../../src";

// Side-effect import: the controller self-registers into `ApplicationContext` on module load,
// so no `@EnableComponentScan()` is needed for this fixture.
import "./UsersController";

/**
 * Boots with `@EnableValidations()` so that whatever `api.validations` config the test supplies
 * via `useConfig()` is actually picked up and turned into `class-validator` options for every
 * request - this is the one thing that only happens because the starter is enabled.
 */
@EnableDI(Container)
@EnableValidations()
@NodeBootApplication()
export class StrictApp implements NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView> {
        return NodeBoot.run(HttpServer, additionalConfig);
    }
}
