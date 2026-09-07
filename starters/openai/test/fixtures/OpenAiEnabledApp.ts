import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableDI} from "@nodeboot/di";
import {JsonObject} from "@nodeboot/context";
import {GhostServer} from "@nodeboot/ghost-server";
import {EnableOpenAI} from "../../src";

/**
 * Boots with `@EnableOpenAI()`. `GhostServer` is used because proving the OpenAI client bean
 * autowires needs only DI + the application lifecycle, not an HTTP transport. Constructing the
 * `OpenAI` SDK client never makes a network call by itself - safe to do in a test with a fake key,
 * as long as nothing actually calls the API.
 */
@EnableDI(Container)
@EnableOpenAI()
@NodeBootApplication()
export class OpenAiEnabledApp implements NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView> {
        return NodeBoot.run(GhostServer, additionalConfig);
    }
}
