import "reflect-metadata";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableRepositories} from "@nodeboot/starter-persistence";
import {KoaServer} from "@nodeboot/koa-server";

import "./persistence/repositories";
import "./services/TodoService";
import "./controllers/HelloController";
import "./controllers/TodoController";
@EnableRepositories()
@NodeBootApplication()
export class NodeBootKoaBenchApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(KoaServer);
    }
}
