import "reflect-metadata";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {JsonObject} from "@nodeboot/context";
import {FastifyServer} from "@nodeboot/fastify-server";
import {EnableOpenApi, EnableSwaggerUI} from "../../src";

import "./TestEntities";
@EnableOpenApi()
@EnableSwaggerUI()
@NodeBootApplication()
export class OpenApiFastifyApp implements NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView> {
        return NodeBoot.run(FastifyServer, additionalConfig);
    }
}
