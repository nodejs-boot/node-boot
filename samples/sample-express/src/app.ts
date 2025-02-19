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
import {EnableOpenApi, EnableSwaggerUI} from "@nodeboot/starter-openapi";
import {AppConfigProperties} from "./config/AppConfigProperties";
import {UserController} from "./controllers/users.controller";
import {LoggingMiddleware} from "./middlewares/LoggingMiddleware";
import {MultipleConfigurations} from "./config/MultipleConfigurations";
import {EnableAuthorization} from "@nodeboot/authorization";
import {LoggedInUserResolver} from "./auth/LoggedInUserResolver";
import {DefaultAuthorizationResolver} from "./auth/DefaultAuthorizationResolver";
import {ExpressServer} from "@nodeboot/express-server";
import {EnableActuator} from "@nodeboot/starter-actuator";
import {EnableRepositories} from "@nodeboot/starter-persistence";
import {EnableDI} from "@nodeboot/di";
import {ErrorMiddleware} from "./middlewares/ErrorMiddleware";
import {NodeBootAppView} from "@nodeboot/core/src/server/NodeBootApp";

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
