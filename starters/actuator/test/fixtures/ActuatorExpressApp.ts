import "reflect-metadata";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {JsonObject} from "@nodeboot/context";
import {ExpressServer} from "@nodeboot/express-server";
import {EnableActuator} from "../../src";
@EnableActuator()
@NodeBootApplication()
export class ActuatorExpressApp implements NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer, additionalConfig);
    }
}
