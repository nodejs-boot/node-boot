import { ApplicationContext } from "@node-boot/context";
import express from "express";
import { useContainer, useExpressServer } from "routing-controllers";
import { BaseApplication } from "@node-boot/core";

export class ExpressApplication extends BaseApplication {
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
    await application.init();

    if (context.diOptions) {
      for (const configurationAdapter of context.configurationAdapters) {
        await configurationAdapter.bind(
          application.expressServer,
          context.diOptions.iocContainer
        );
      }

      for (const configurationPropertiesAdapter of context.configurationPropertiesAdapters) {
        configurationPropertiesAdapter.bind(context.diOptions.iocContainer);
      }

      // it's important to set container before any operation you do with routing-controllers,
      // including importing controllers
      useContainer(context.diOptions.iocContainer, context.diOptions.options);
    }

    // Bind application container through adapter
    if (ApplicationContext.get().applicationAdapter) {
      const configs = ApplicationContext.get().applicationAdapter!.bind();
      useExpressServer(application.expressServer, configs);
    } else {
      throw new Error(
        "Error stating Application. Please enable NodeBoot application using @NodeBootExpressApplication or @NodeBootKoaApplication"
      );
    }

    if (context.openApi) {
      context.openApi.bind(
        application.expressServer,
        context.controllerClasses
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

  public getServer() {
    return this.expressServer;
  }
}
