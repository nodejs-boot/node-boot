import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableDI} from "@nodeboot/di";
import {EnableRepositories} from "@nodeboot/starter-persistence";
import {HttpServer} from "@nodeboot/http-server";

import "./persistence/repositories";
import "./services/TodoService";
import "./controllers/HelloController";
import "./controllers/TodoController";

@EnableDI(Container)
@EnableRepositories()
@NodeBootApplication()
export class NodeBootHttpBenchApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(HttpServer);
    }
}
