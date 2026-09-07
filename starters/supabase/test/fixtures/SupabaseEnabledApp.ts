import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableDI} from "@nodeboot/di";
import {JsonObject} from "@nodeboot/context";
import {GhostServer} from "@nodeboot/ghost-server";
import {EnableSupabase} from "../../src";

/**
 * Boots with `@EnableSupabase()`. `GhostServer` is used because proving the Supabase client bean
 * autowires needs only DI + the application lifecycle, not an HTTP transport. `createClient(...)`
 * never makes a network call by itself - safe to do in a test with a fake key, as long as nothing
 * actually calls the API.
 *
 * Unlike the other starters tested this way, `SupabaseConfiguration`'s `@Bean` throws synchronously
 * when `integrations.supabase` is missing (not just a warning), which would fail this app's boot
 * itself - so there's no clean "disabled" `useNodeBoot()` counterpart here (`@EnableRepositories()`
 * has the same trait; see `nodeboot-extending-nodeboot`'s "Testing a starter package" section).
 */
@EnableDI(Container)
@EnableSupabase()
@NodeBootApplication()
export class SupabaseEnabledApp implements NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView> {
        return NodeBoot.run(GhostServer, additionalConfig);
    }
}
