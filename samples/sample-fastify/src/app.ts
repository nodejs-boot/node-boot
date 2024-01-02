import "reflect-metadata";
import {Container} from "typedi";
import {Configurations, Controllers, GlobalMiddlewares, NodeBoot, NodeBootApplication} from "@node-boot/core";
import {UserController} from "./controllers/users.controller";
import {LoggingMiddleware} from "./middlewares/LoggingMiddleware";
import {MultipleConfigurations} from "./config/MultipleConfigurations";
import {EnableAuthorization} from "@node-boot/authorization";
import {LoggedInUserResolver} from "./auth/LoggedInUserResolver";
import {DefaultAuthorizationResolver} from "./auth/DefaultAuthorizationResolver";
import {FastifyServer} from "@node-boot/fastify-server";
import {EnableOpenApi, EnableSwaggerUI} from "@node-boot/openapi";
import {EnableActuator} from "@node-boot/starter-actuator";
import {EnableRepositories} from "@node-boot/starter-persistence";
import {EnableDI} from "@node-boot/di";
import {CustomErrorHandler} from "./middlewares/CustomErrorHandler";
import {AppConfigProperties} from "./config/AppConfigProperties";

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
export class FactsServiceApp {
    static start() {
        NodeBoot.run(FastifyServer)
            .then(app => {
                app.listen();
                console.info("Node-Boot application started successfully");
            })
            .catch(error => {
                console.error("Error starting Node-Boot application.", error);
            });
    }
}
