import "reflect-metadata";
import {Container} from "typedi";
import {Configurations, Controllers, GlobalMiddlewares, NodeBoot, NodeBootApplication} from "@node-boot/core";
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
export class FactsServiceApp {
    static start() {
        NodeBoot.run(KoaServer)
            .then(app => {
                app.listen();
                console.info("Node-Boot application started successfully");
            })
            .catch(error => {
                console.error("Error starting Node-Boot application.", error);
            });
    }
}
