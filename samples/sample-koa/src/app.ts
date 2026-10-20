import "reflect-metadata";
import "./__generated__/nonna-dependencies.generated";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableAuthorization} from "@nodeboot/authorization";
import {LoggedInUserResolver} from "./auth/LoggedInUserResolver";
import {KoaServer} from "@nodeboot/koa-server";
import {EnableOpenApi, EnableSwaggerUI} from "@nodeboot/starter-openapi";
import {EnableActuator} from "@nodeboot/starter-actuator";
import {EnableRepositories} from "@nodeboot/starter-persistence";
import {EnableScheduling} from "@nodeboot/starter-scheduler";
import {EnableComponentScan} from "@nodeboot/aot";
import {EnableHttpClients} from "@nodeboot/starter-http";
import {DefaultAuthorizationChecker} from "./auth/DefaultAuthorizationChecker";
import {EnableValidations} from "@nodeboot/starter-validation";
@EnableOpenApi()
@EnableSwaggerUI()
@EnableAuthorization(LoggedInUserResolver, DefaultAuthorizationChecker)
@EnableActuator()
@EnableRepositories()
@EnableScheduling()
@EnableHttpClients()
@EnableValidations()
@EnableComponentScan()
@NodeBootApplication()
export class FactsServiceApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(KoaServer);
    }
}
