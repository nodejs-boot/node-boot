import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {JsonObject} from "@nodeboot/context";
import {GhostServer} from "../../src";

// Side-effect imports: each `@Component`/`@Configuration` self-registers into `ApplicationContext`
// on module load, so no `@EnableComponentScan()` is needed for tests.
import "./DefaultDiGreetingService";
import "./DefaultDiUserService";
import "./DefaultDiAppConfiguration";

@NodeBootApplication()
export class DefaultDiTestApp implements NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView> {
        return NodeBoot.run(GhostServer, additionalConfig);
    }
}
