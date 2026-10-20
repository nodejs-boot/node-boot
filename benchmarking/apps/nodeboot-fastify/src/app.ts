import "reflect-metadata";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableRepositories} from "@nodeboot/starter-persistence";
import {FastifyServer} from "@nodeboot/fastify-server";

import "./persistence/repositories";
import "./services/TodoService";
import "./controllers/HelloController";
import "./controllers/TodoController";
@EnableRepositories()
@NodeBootApplication()
export class NodeBootFastifyBenchApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(FastifyServer);
    }
}
