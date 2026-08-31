import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableDI} from "@nodeboot/di";
import {JsonObject} from "@nodeboot/context";
import {GhostServer} from "../../src";

// Side-effect imports: each `@Component`/`@Configuration` self-registers into `ApplicationContext`
// on module load, so no `@EnableComponentScan()` is needed for tests.
import "./GreetingService";
import "./UserService";
import "./AppConfiguration";

@EnableDI(Container)
@NodeBootApplication()
export class TestApp implements NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView> {
        return NodeBoot.run(GhostServer, additionalConfig);
    }
}
