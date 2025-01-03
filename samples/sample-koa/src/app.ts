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
import {KoaServer} from "@node-boot/koa-server";
import {EnableOpenApi, EnableSwaggerUI} from "@node-boot/starter-openapi";
import {EnableActuator} from "@node-boot/starter-actuator";
import {EnableDI} from "@node-boot/di";
import {AppConfigProperties} from "./config/AppConfigProperties";
import {EnableRepositories} from "@node-boot/starter-persistence";
import {CustomErrorHandler} from "./middlewares/CustomErrorHandler";
import {DefaultAuthorizationChecker} from "./auth/DefaultAuthorizationChecker";
import {NodeBootAppView} from "@node-boot/core/src/server/NodeBootApp";

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
@EnableAuthorization(LoggedInUserResolver, DefaultAuthorizationChecker)
@EnableRepositories()
@NodeBootApplication()
export class FactsServiceApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(KoaServer);
    }
}
