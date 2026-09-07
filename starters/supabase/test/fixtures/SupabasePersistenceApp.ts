import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableDI} from "@nodeboot/di";
import {JsonObject} from "@nodeboot/context";
import {GhostServer} from "@nodeboot/ghost-server";
import {EnableSupabase} from "../../src";
import {EnableRepositories} from "@nodeboot/starter-persistence";
import "./UserProfileRepository";

/**
 * Boots with both `@EnableSupabase()` and `@EnableRepositories()`, combining Supabase services
 * with direct relational database access via Node-Boot's TypeORM persistence starter.
 */
@EnableDI(Container)
@EnableSupabase()
@EnableRepositories()
@NodeBootApplication()
export class SupabasePersistenceApp implements NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView> {
        return NodeBoot.run(GhostServer, additionalConfig);
    }
}
