import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableDI} from "@nodeboot/di";
import {JsonObject} from "@nodeboot/context";
import {GhostServer} from "@nodeboot/ghost-server";
import {EnableFirebase} from "../../src";

/**
 * Boots with `@EnableFirebase()`. `GhostServer` is used because proving the Firebase Admin beans
 * autowire needs only DI + the application lifecycle, not an HTTP transport. `admin.initializeApp()`
 * and the per-service beans it exposes (`admin.auth()`, `admin.firestore()`, ...) never make a
 * network call by themselves - only actually calling a method on them would.
 */
@EnableDI(Container)
@EnableFirebase()
@NodeBootApplication()
export class FirebaseEnabledApp implements NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView> {
        return NodeBoot.run(GhostServer, additionalConfig);
    }
}
