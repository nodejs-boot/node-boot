import "reflect-metadata";
import { Container } from "typedi";
import {
  BaseApplication,
  Configurations,
  Controllers,
  EnableDI,
  GlobalMiddlewares,
  NodeBootApplication
} from "@node-boot/core";
import { EnableOpenApi } from "@node-boot/openapi";
import { ExpressApplication } from "@node-boot/express-starter";
import { BackendConfigProperties } from "./config/BackendConfigProperties";
import { UserController } from "./controllers/users.controller";
import { LoggingMiddleware } from "./middlewares/LoggingMiddleware";
import { MultipleConfigurations } from "./config/MultipleConfigurations";

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
/*
@GlobalMiddlewares([
  LoggingMiddleware
])*/
@NodeBootApplication({
  environment: "development",
  port: 3000
})
export class FactsServiceApp extends BaseApplication {
  static start() {
    ExpressApplication.run()
      .then((app) => {
        app.listen();
        console.info("Node-Boot application started successfully");
      })
      .catch((error) => {
        console.error("Error starting Node-Boot application.", error);
      });
  }
}
