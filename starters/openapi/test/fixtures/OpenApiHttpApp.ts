import "reflect-metadata";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {JsonObject} from "@nodeboot/context";
import {HttpServer} from "@nodeboot/http-server";
import {EnableOpenApi, EnableSwaggerUI} from "../../src";

import "./TestEntities";
@EnableOpenApi()
@EnableSwaggerUI()
@NodeBootApplication()
export class OpenApiHttpApp implements NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView> {
        return NodeBoot.run(HttpServer, additionalConfig);
    }
}
