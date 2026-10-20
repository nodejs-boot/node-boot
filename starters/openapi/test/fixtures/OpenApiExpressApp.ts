import "reflect-metadata";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {JsonObject} from "@nodeboot/context";
import {ExpressServer} from "@nodeboot/express-server";
import {EnableOpenApi, EnableSwaggerUI} from "../../src";

import "./TestEntities";
@EnableOpenApi()
@EnableSwaggerUI()
@NodeBootApplication()
export class OpenApiExpressApp implements NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer, additionalConfig);
    }
}
