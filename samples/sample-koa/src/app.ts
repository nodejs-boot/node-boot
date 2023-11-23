import "reflect-metadata";
import { Container } from "typedi";
import {
  Configurations,
  Controllers,
  EnableDI,
  GlobalMiddlewares,
  NodeBoot,
  NodeBootApplication
} from "@node-boot/core";
import { BackendConfigProperties } from "./config/BackendConfigProperties";
import { UserController } from "./controllers/users.controller";
import { LoggingMiddleware } from "./middlewares/LoggingMiddleware";
import { MultipleConfigurations } from "./config/MultipleConfigurations";
import { EnableAuthorization } from "@node-boot/authorization";
import { LoggedInUserResolver } from "./auth/LoggedInUserResolver";
import { DefaultAuthorizationResolver } from "./auth/DefaultAuthorizationResolver";
import { KoaApplication } from "@node-boot/koa-server";
import { EnableOpenApi } from "@node-boot/openapi";

@EnableDI(Container)
@EnableOpenApi()
@Configurations([BackendConfigProperties, MultipleConfigurations])
@Controllers([UserController])
@GlobalMiddlewares([LoggingMiddleware])
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
    NodeBoot.run(KoaApplication)
      .then((app) => {
        app.listen();
        console.info("Node-Boot application started successfully");
      })
      .catch((error) => {
        console.error("Error starting Node-Boot application.", error);
      });
  }
}
