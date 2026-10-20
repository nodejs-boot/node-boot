import "reflect-metadata";
import "./__generated__/nonna-dependencies.generated";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableRepositories} from "@nodeboot/starter-persistence";
import {EnableScheduling} from "@nodeboot/starter-scheduler";
import {EnableComponentScan} from "@nodeboot/aot";
import {EnableHttpClients} from "@nodeboot/starter-http";
import {GhostServer} from "@nodeboot/ghost-server";
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
