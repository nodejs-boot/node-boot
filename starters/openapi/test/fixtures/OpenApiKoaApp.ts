import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableDI} from "@nodeboot/di";
import {JsonObject} from "@nodeboot/context";
import {KoaServer} from "@nodeboot/koa-server";
import {EnableOpenApi, EnableSwaggerUI} from "../../src";

import "./TestEntities";

@EnableDI(Container)
@EnableOpenApi()
@EnableSwaggerUI()
@NodeBootApplication()
export class OpenApiKoaApp implements NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView> {
        return NodeBoot.run(KoaServer, additionalConfig);
    }
}
