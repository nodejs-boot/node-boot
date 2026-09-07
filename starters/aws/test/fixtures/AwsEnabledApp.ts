import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableDI} from "@nodeboot/di";
import {JsonObject} from "@nodeboot/context";
import {GhostServer} from "@nodeboot/ghost-server";
import {EnableAws} from "../../src";

/**
 * Boots with `@EnableAws()`. `GhostServer` is used because proving the AWS client beans autowire
 * needs only DI + the application lifecycle, not an HTTP transport. Constructing an AWS SDK v3
 * client (e.g. `new S3Client({region, credentials})`) never makes a network call by itself - it's
 * safe to do in a test with no real credentials, as long as nothing actually calls the API.
 */
@EnableDI(Container)
@EnableAws()
@NodeBootApplication()
export class AwsEnabledApp implements NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView> {
        return NodeBoot.run(GhostServer, additionalConfig);
    }
}
