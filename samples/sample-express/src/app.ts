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
import {EnableOpenApi, EnableSwaggerUI} from "@node-boot/starter-openapi";
import {AppConfigProperties} from "./config/AppConfigProperties";
import {UserController} from "./controllers/users.controller";
import {LoggingMiddleware} from "./middlewares/LoggingMiddleware";
import {MultipleConfigurations} from "./config/MultipleConfigurations";
import {EnableAuthorization} from "@node-boot/authorization";
import {LoggedInUserResolver} from "./auth/LoggedInUserResolver";
import {DefaultAuthorizationResolver} from "./auth/DefaultAuthorizationResolver";
import {ExpressServer} from "@node-boot/express-server";
import {EnableActuator} from "@node-boot/starter-actuator";
import {EnableRepositories} from "@node-boot/starter-persistence";
import {EnableDI} from "@node-boot/di";
import {ErrorMiddleware} from "./middlewares/ErrorMiddleware";
import {NodeBootAppView} from "@node-boot/core/src/server/NodeBootApp";

@EnableDI(Container)
@EnableOpenApi()
@EnableSwaggerUI()
@Configurations([AppConfigProperties, MultipleConfigurations])
@Controllers([UserController])
@GlobalMiddlewares([LoggingMiddleware, ErrorMiddleware])
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
@EnableAuthorization(LoggedInUserResolver, DefaultAuthorizationResolver)
@EnableActuator()
@EnableRepositories()
@NodeBootApplication()
export class FactsServiceApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
