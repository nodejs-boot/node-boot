import "reflect-metadata";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {JsonObject} from "@nodeboot/context";
import {HonoServer} from "@nodeboot/hono-server";
import {EnableOpenApi, EnableSwaggerUI} from "../../src";

import "./TestEntities";
@EnableOpenApi()
@EnableSwaggerUI()
@NodeBootApplication()
export class OpenApiHonoApp implements NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView> {
        return NodeBoot.run(HonoServer, additionalConfig);
    }
}
