import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {JsonObject} from "@nodeboot/context";
import {EnableDI} from "@nodeboot/di";
import {Container} from "typedi";
import {GhostServer} from "../../src";

import "./PluginDiGreeter";
import "./PluginDiUserService";

@EnableDI(Container)
@NodeBootApplication()
export class PluginDiTestApp implements NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView> {
        return NodeBoot.run(GhostServer, additionalConfig);
    }
}
