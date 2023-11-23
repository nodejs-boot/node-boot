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
import { EnableOpenApi } from "@node-boot/openapi";
import { BackendConfigProperties } from "./config/BackendConfigProperties";
import { UserController } from "./controllers/users.controller";
import { LoggingMiddleware } from "./middlewares/LoggingMiddleware";
import { MultipleConfigurations } from "./config/MultipleConfigurations";
import { ErrorMiddleware } from "./middlewares/error.middleware";
import { EnableAuthorization } from "@node-boot/authorization";
import { LoggedInUserResolver } from "./auth/LoggedInUserResolver";
import { DefaultAuthorizationResolver } from "./auth/DefaultAuthorizationResolver";
import { ExpressServer } from "@node-boot/express-server";
import { EnableActuator } from "@node-boot/starter-actuator";

@EnableDI(Container)
@EnableOpenApi()
@Configurations([BackendConfigProperties, MultipleConfigurations])
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
@NodeBootApplication({
  environment: "development",
  appName: "facts-service",
  platformName: "tech-insights",
  defaultErrorHandler: false,
  port: 3000,
  apiOptions: {
    routePrefix: "/api"
  }
})
export class FactsServiceApp {
  static start() {
    NodeBoot.run(ExpressServer)
      .then((app) => {
        app.listen();
        console.info("Node-Boot application started successfully");
      })
      .catch((error) => {
        console.error("Error starting Node-Boot application.", error);
      });
  }
}
