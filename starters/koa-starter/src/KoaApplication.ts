import { ApplicationContext } from "@node-boot/context";
import Koa from "koa";
import Router from "@koa/router";
import { createServer, KoaDriver } from "routing-controllers";
import { BaseApplication } from "@node-boot/core";

export class KoaApplication extends BaseApplication<Koa, Router> {
  private readonly server: Koa;
  private readonly router: Router;

  constructor() {
    super("koa");
    this.server = new Koa();
    this.router = new Router();
  }

  static async run(): Promise<KoaApplication> {
    const context = ApplicationContext.get();

    const application = new KoaApplication();
    await application.configure(application.server, application.router);

    // Bind application container through adapter
    if (context.applicationAdapter) {
      const configs = context.applicationAdapter.bind(
        context.diOptions?.iocContainer
      );

      const driver = new KoaDriver(application.server, application.router);
      createServer(driver, configs);
    } else {
      throw new Error(
        "Error stating Application. Please enable NodeBoot application using @NodeBootApplication"
      );
    }

    return application;
  }

  public listen() {
    const context = ApplicationContext.get();

    this.server.listen(context.applicationOptions.port, () => {
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

  getServer(): Koa {
    return this.server;
  }

  getRouter(): Router {
    return this.router;
  }
}
