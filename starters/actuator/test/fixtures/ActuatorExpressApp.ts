import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableDI} from "@nodeboot/di";
import {JsonObject} from "@nodeboot/context";
import {ExpressServer} from "@nodeboot/express-server";
import {EnableActuator} from "../../src";

@EnableDI(Container)
@EnableActuator()
@NodeBootApplication()
export class ActuatorExpressApp implements NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer, additionalConfig);
    }
}
