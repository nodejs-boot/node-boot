import "reflect-metadata";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {JsonObject} from "@nodeboot/context";
import {GhostServer} from "@nodeboot/ghost-server";
import {EnableSupabase} from "../../src";
import "./SampleSupabaseService";

/**
 * Boots with `@EnableSupabase()` and a sample service registered in DI container.
 */
@EnableSupabase()
@NodeBootApplication()
export class SupabaseServiceApp implements NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView> {
        return NodeBoot.run(GhostServer, additionalConfig);
    }
}
