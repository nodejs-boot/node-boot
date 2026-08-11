import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableAuthorization} from "@nodeboot/authorization";
import {EnableValidations} from "@nodeboot/starter-validation";
import {EnableComponentScan} from "@nodeboot/aot";
import {EnableDI} from "@nodeboot/di";
import {LambdaServer} from "@nodeboot/lambda-server";
import {LoggedInUserResolver} from "./auth/LoggedInUserResolver";
import {DefaultAuthorizationResolver} from "./auth/DefaultAuthorizationResolver";

/**
 * NodeBoot application entry point.
 *
 * Notice that, unlike the Express/Koa/Fastify samples, this application does not
 * "listen" on a port. Instead, it is bootstrapped once per Lambda container (cold start)
 * and its `LambdaServer` exposes a `handler` function that AWS Lambda invokes for
 * every incoming API Gateway event. See `src/handler.ts`.
 */
@EnableDI(Container)
@EnableAuthorization(LoggedInUserResolver, DefaultAuthorizationResolver)
@EnableValidations()
@EnableComponentScan()
@NodeBootApplication()
export class LambdaSampleApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(LambdaServer);
    }
}
