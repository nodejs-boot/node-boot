import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableDI} from "@nodeboot/di";
import {JsonObject} from "@nodeboot/context";
import {HttpServer} from "@nodeboot/http-server";
import {EnableOpenApi, EnableSwaggerUI} from "../../src";

import "./TestEntities";

@EnableDI(Container)
@EnableOpenApi()
@EnableSwaggerUI()
@NodeBootApplication()
export class OpenApiHttpApp implements NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView> {
        return NodeBoot.run(HttpServer, additionalConfig);
    }
}
