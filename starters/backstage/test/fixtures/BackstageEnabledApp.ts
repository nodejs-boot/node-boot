import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableDI} from "@nodeboot/di";
import {JsonObject} from "@nodeboot/context";
import {GhostServer} from "@nodeboot/ghost-server";
import {EnableBackstage} from "../../src";

/**
 * Boots with `@EnableBackstage()`. `GhostServer` is used because proving the Backstage beans
 * autowire needs only DI + the application lifecycle, not an HTTP transport. `CatalogClientProxy`'s
 * constructor never makes a network call - it just stores a lazy `discoveryApi.getBaseUrl()`
 * closure, resolved only when an actual catalog method is invoked.
 */
@EnableDI(Container)
@EnableBackstage()
@NodeBootApplication()
export class BackstageEnabledApp implements NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView> {
        return NodeBoot.run(GhostServer, additionalConfig);
    }
}
