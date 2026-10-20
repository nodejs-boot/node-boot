import "reflect-metadata";
import "./__generated__/nonna-dependencies.generated";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableAuthorization} from "@nodeboot/authorization";
import {LoggedInUserResolver} from "./auth/LoggedInUserResolver";
import {DefaultAuthorizationResolver} from "./auth/DefaultAuthorizationResolver";
import {FastifyServer} from "@nodeboot/fastify-server";
import {EnableRepositories} from "@nodeboot/starter-persistence";
import {EnableActuator} from "@nodeboot/starter-actuator";
import {EnableOpenApi, EnableSwaggerUI} from "@nodeboot/starter-openapi";
import {EnableComponentScan} from "@nodeboot/aot";
import {EnableScheduling} from "@nodeboot/starter-scheduler";
import {EnableHttpClients} from "@nodeboot/starter-http";
import {EnableValidations} from "@nodeboot/starter-validation";
@EnableOpenApi()
@EnableSwaggerUI()
@EnableAuthorization(LoggedInUserResolver, DefaultAuthorizationResolver)
@EnableActuator()
@EnableRepositories()
@EnableScheduling()
@EnableHttpClients()
@EnableValidations()
@EnableComponentScan()
@NodeBootApplication()
export class FactsServiceApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(FastifyServer);
    }
}
