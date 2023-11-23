import { ApplicationContext } from "@node-boot/context";
import { Logger } from "winston";
import { createLogger } from "../logger";
import { ConfigService, loadNodeBootConfig } from "@node-boot/config";
import { useContainer } from "routing-controllers";

export abstract class BaseApplication<TServer> {
  protected logger: Logger;
  protected config: ConfigService;

  protected async init() {
    const context = ApplicationContext.get();
    await this.loadConfig(context);
    await this.initLogger(context);
  }

  abstract listen();

  abstract getServer(): TServer;

  protected async configure(server: TServer) {
    const context = ApplicationContext.get();
    if (context.diOptions) {
      for (const configurationAdapter of context.configurationAdapters) {
        await configurationAdapter.bind(server, context.diOptions.iocContainer);
      }

      for (const configurationPropertiesAdapter of context.configurationPropertiesAdapters) {
        configurationPropertiesAdapter.bind(context.diOptions.iocContainer);
      }

      // it's important to set container before any operation you do with routing-controllers,
      // including importing controllers
      useContainer(context.diOptions.iocContainer, context.diOptions.options);
    }

    if (context.openApi) {
      context.openApi.bind(server, context.controllerClasses);
    }
  }

  private async loadConfig(context: ApplicationContext) {
    this.config = (
      await loadNodeBootConfig({
        argv: process.argv
      })
    ).config;
    context.diOptions?.iocContainer.set(ConfigService, this.config);
    context.diOptions?.iocContainer.set("config", this.config);
  }

  private async initLogger(context: ApplicationContext) {
    this.logger = createLogger(
      context.applicationOptions.appName!,
      context.applicationOptions.platformName!
    );
    context.diOptions?.iocContainer.set(Logger, this.logger);
    context.diOptions?.iocContainer.set("logger", this.logger);
  }
}
