import { ApplicationContext } from "@node-boot/context";
import { Logger } from "winston";
import { createLogger } from "../logger";
import { ConfigService, loadNodeBootConfig } from "@node-boot/config";

export abstract class BaseApplication {
  protected logger: Logger;
  protected config: ConfigService;

  protected async init() {
    const context = ApplicationContext.get();
    await this.loadConfig(context);
    await this.initLogger(context);
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
