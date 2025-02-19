import "reflect-metadata";
import {Container} from "typedi";
import {
    Configurations,
    Controllers,
    GlobalMiddlewares,
    NodeBoot,
    NodeBootApp,
    NodeBootApplication,
} from "@nodeboot/core";
import {UserController} from "./controllers/users.controller";
import {LoggingMiddleware} from "./middlewares/LoggingMiddleware";
import {MultipleConfigurations} from "./config/MultipleConfigurations";
import {EnableAuthorization} from "@nodeboot/authorization";
import {LoggedInUserResolver} from "./auth/LoggedInUserResolver";
import {KoaServer} from "@nodeboot/koa-server";
import {EnableOpenApi, EnableSwaggerUI} from "@nodeboot/starter-openapi";
import {EnableActuator} from "@nodeboot/starter-actuator";
import {EnableDI} from "@nodeboot/di";
import {AppConfigProperties} from "./config/AppConfigProperties";
import {EnableRepositories} from "@nodeboot/starter-persistence";
import {CustomErrorHandler} from "./middlewares/CustomErrorHandler";
import {DefaultAuthorizationChecker} from "./auth/DefaultAuthorizationChecker";
import {NodeBootAppView} from "@nodeboot/core/src/server/NodeBootApp";

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
