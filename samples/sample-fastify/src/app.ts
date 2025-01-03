import "reflect-metadata";
import {Container} from "typedi";
import {
    Configurations,
    Controllers,
    GlobalMiddlewares,
    NodeBoot,
    NodeBootApp,
    NodeBootApplication,
} from "@node-boot/core";
import {UserController} from "./controllers/users.controller";
import {LoggingMiddleware} from "./middlewares/LoggingMiddleware";
import {MultipleConfigurations} from "./config/MultipleConfigurations";
import {EnableAuthorization} from "@node-boot/authorization";
import {LoggedInUserResolver} from "./auth/LoggedInUserResolver";
import {DefaultAuthorizationResolver} from "./auth/DefaultAuthorizationResolver";
import {FastifyServer} from "@node-boot/fastify-server";
import {EnableRepositories} from "@node-boot/starter-persistence";
import {EnableDI} from "@node-boot/di";
import {CustomErrorHandler} from "./middlewares/CustomErrorHandler";
import {AppConfigProperties} from "./config/AppConfigProperties";
import {NodeBootAppView} from "@node-boot/core/src/server/NodeBootApp";
import {EnableActuator} from "@node-boot/starter-actuator";
import {EnableOpenApi, EnableSwaggerUI} from "@node-boot/starter-openapi";

@EnableDI(Container)
@EnableOpenApi()
@EnableSwaggerUI()
@Configurations([AppConfigProperties, MultipleConfigurations])
@Controllers([UserController])
@GlobalMiddlewares([LoggingMiddleware, CustomErrorHandler])
//@EnableComponentScan()
/*
* @EnableComponentScan({
  controllerPaths: [
    "/controllers"
  ],
  middlewarePaths: [
    "/middlewares"
  ]
})
* */
@EnableActuator()
@EnableAuthorization(LoggedInUserResolver, DefaultAuthorizationResolver)
@EnableRepositories()
@NodeBootApplication()
export class FactsServiceApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(FastifyServer);
    }
}
