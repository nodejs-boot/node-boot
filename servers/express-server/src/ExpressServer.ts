import { ApplicationContext } from "@node-boot/context";
import express from "express";
import { useExpressServer } from "routing-controllers";
import { BaseServer } from "@node-boot/core";

export class ExpressServer extends BaseServer<
  express.Application,
  express.Application
> {
  public framework: express.Application;

  constructor() {
    super("express");
    this.framework = express();
    this.framework.use(express.json());
    this.framework.use(express.urlencoded({ extended: true }));
  }

  async run(): Promise<ExpressServer> {
    const context = ApplicationContext.get();

    await this.configure(this.getFramework(), this.getRouter());

    // Bind application container through adapter
    if (context.applicationAdapter) {
      const configs = context.applicationAdapter.bind(
        context.diOptions?.iocContainer
      );
      useExpressServer(this.framework, configs);
    } else {
      throw new Error(
        "Error stating Application. Please enable NodeBoot application using @NodeBootApplication"
      );
    }

    return this;
  }

  public listen() {
    const context = ApplicationContext.get();

    this.framework.listen(context.applicationOptions.port, () => {
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

  getFramework(): express.Application {
    return this.framework;
  }

  getRouter(): express.Application {
    return this.framework;
  }
}
