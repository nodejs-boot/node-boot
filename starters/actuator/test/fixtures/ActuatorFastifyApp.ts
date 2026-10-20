import "reflect-metadata";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {JsonObject} from "@nodeboot/context";
import {FastifyServer} from "@nodeboot/fastify-server";
import {EnableActuator} from "../../src";
@EnableActuator()
@NodeBootApplication()
export class ActuatorFastifyApp implements NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView> {
        return NodeBoot.run(FastifyServer, additionalConfig);
    }
}
