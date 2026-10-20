import "reflect-metadata";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {JsonObject} from "@nodeboot/context";
import {GhostServer} from "../../src";

// Side-effect imports: each `@Component`/`@Configuration` self-registers into `ApplicationContext`
// on module load, so no `@EnableComponentScan()` is needed for tests.
import "./GreetingService";
import "./UserService";
import "./AppConfiguration";
@NodeBootApplication()
export class TestApp implements NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView> {
        return NodeBoot.run(GhostServer, additionalConfig);
    }
}
