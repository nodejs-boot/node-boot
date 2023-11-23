import { ApplicationContext } from "@node-boot/context";
import express from "express";
import { useExpressServer } from "routing-controllers";
import { BaseApplication } from "@node-boot/core";

export class ExpressApplication extends BaseApplication<express.Application> {
  public expressServer: express.Application;

  constructor() {
    super();
    this.expressServer = express();
    this.expressServer.use(express.json());
    this.expressServer.use(express.urlencoded({ extended: true }));
  }

  static async run(): Promise<ExpressApplication> {
    const context = ApplicationContext.get();

    const application = new ExpressApplication();
    await application.configure(application.getServer());

    // Bind application container through adapter
    if (context.applicationAdapter) {
      const configs = context.applicationAdapter.bind(
        context.diOptions?.iocContainer
      );
      useExpressServer(application.expressServer, configs);
    } else {
      throw new Error(
        "Error stating Application. Please enable NodeBoot application using @NodeBootApplication"
      );
    }

    return application;
  }

  public listen() {
    const context = ApplicationContext.get();

    this.expressServer.listen(context.applicationOptions.port, () => {
      this.logger.info(`=================================`);
      this.logger.info(
        `======= ENV: ${context.applicationOptions.environment} =======`
      );
      this.logger.info(
        `🚀 App listening on the port ${context.applicationOptions.port}`
      );
      this.logger.info(`=================================`);
    });
  }

  getServer(): express.Application {
    return this.expressServer;
  }
}
