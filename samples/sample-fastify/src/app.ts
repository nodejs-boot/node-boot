import "reflect-metadata";
import { Container } from "typedi";
import {
  Configurations,
  Controllers,
  EnableDI,
  GlobalMiddlewares,
  NodeBootApplication
} from "@node-boot/core";
import { BackendConfigProperties } from "./config/BackendConfigProperties";
import { UserController } from "./controllers/users.controller";
import { LoggingMiddleware } from "./middlewares/LoggingMiddleware";
import { MultipleConfigurations } from "./config/MultipleConfigurations";
import { CustomErrorHandler } from "./middlewares/customErrorHandler";
import { EnableAuthorization } from "@node-boot/authorization";
import { LoggedInUserResolver } from "./auth/LoggedInUserResolver";
import { DefaultAuthorizationResolver } from "./auth/DefaultAuthorizationResolver";
import { FastifyApplication } from "@node-boot/fastify-server";

@EnableDI(Container)
//@EnableOpenApi()
@Configurations([BackendConfigProperties, MultipleConfigurations])
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
@EnableAuthorization(LoggedInUserResolver, DefaultAuthorizationResolver)
@NodeBootApplication({
  environment: "development",
  appName: "facts-service",
  platformName: "tech-insights",
  defaultErrorHandler: false,
  port: 3000
})
export class FactsServiceApp {
  static start() {
    FastifyApplication.run()
      .then((app) => {
        app.listen();
        console.info("Node-Boot application started successfully");
      })
      .catch((error) => {
        console.error("Error starting Node-Boot application.", error);
      });
  }
}
