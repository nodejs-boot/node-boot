import "reflect-metadata";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {JsonObject} from "@nodeboot/context";
import {KoaServer} from "@nodeboot/koa-server";
import {EnableActuator} from "../../src";
@EnableActuator()
@NodeBootApplication()
export class ActuatorKoaApp implements NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView> {
        return NodeBoot.run(KoaServer, additionalConfig);
    }
}
