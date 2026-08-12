import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableDI} from "@nodeboot/di";
import {EnableRepositories} from "@nodeboot/starter-persistence";
import {ExpressServer} from "@nodeboot/express-server";

// Controllers, services and repositories are imported here for their side effects (decorator
// registration), mirroring the explicit-import pattern used by the serverless Node-Boot samples
// (Cloudflare/Vercel/Netlify) instead of `@EnableComponentScan()` + `@nodeboot/aot`, so this
// benchmark app needs no extra codegen build step.
import "./persistence/repositories";
import "./services/TodoService";
import "./controllers/HelloController";
import "./controllers/TodoController";

@EnableDI(Container)
@EnableRepositories()
@NodeBootApplication()
export class NodeBootExpressBenchApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
