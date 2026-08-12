import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableDI} from "@nodeboot/di";
import {EnableRepositories} from "@nodeboot/starter-persistence";
import {FastifyServer} from "@nodeboot/fastify-server";

import "./persistence/repositories";
import "./services/TodoService";
import "./controllers/HelloController";
import "./controllers/TodoController";

@EnableDI(Container)
@EnableRepositories()
@NodeBootApplication()
export class NodeBootFastifyBenchApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(FastifyServer);
    }
}
