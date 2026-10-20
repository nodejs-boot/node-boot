import "reflect-metadata";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {JsonObject} from "@nodeboot/context";
import {HonoServer} from "@nodeboot/hono-server";
import {EnableActuator} from "../../src";
@EnableActuator()
@NodeBootApplication()
export class ActuatorHonoApp implements NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView> {
        return NodeBoot.run(HonoServer, additionalConfig);
    }
}
