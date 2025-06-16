import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableRepositories} from "@nodeboot/starter-persistence";
import {EnableDI} from "@nodeboot/di";
import {EnableScheduling} from "@nodeboot/starter-scheduler";
import {EnableComponentScan} from "@nodeboot/aot";
import {EnableHttpClients} from "@nodeboot/starter-http";
import {GhostServer} from "@nodeboot/ghost-server";

@EnableDI(Container)
@EnableRepositories()
@EnableScheduling()
@EnableHttpClients()
@EnableComponentScan()
@NodeBootApplication()
export class GhostApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(GhostServer);
    }
}
