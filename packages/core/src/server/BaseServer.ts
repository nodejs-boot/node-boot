import {ApplicationContext, Config} from "@node-boot/context";
import {Logger} from "winston";
import {createLogger} from "../logger";
import {ConfigService, loadNodeBootConfig} from "@node-boot/config";
import {useContainer} from "routing-controllers";

export abstract class BaseServer<TFramework = any, TRouter = any> {
    protected logger: Logger;
    protected config: Config;

    protected constructor(private readonly serverType: string) {}

    protected async init() {
        const context = ApplicationContext.get();
        await this.initLogger(context);
        await this.loadConfig(context);
    }

    abstract listen();

    abstract getFramework(): TFramework;

    abstract getRouter(): TRouter;

    abstract run(): Promise<BaseServer>;

    protected async configure(framework: TFramework, router: TRouter) {
        // Initialize configuration and logging
        await this.init();

        this.logger.info(
            `Running Node-Boot application with '${this.serverType.toUpperCase()}'`,
        );
        const context = ApplicationContext.get();
        if (context.diOptions) {
            this.logger.info(`Binding Node-Boot @Configuration classes`);
            for (const configurationAdapter of context.configurationAdapters) {
                await configurationAdapter.bind({
                    application: framework,
                    iocContainer: context.diOptions.iocContainer,
                    logger: this.logger,
                    config: this.config,
                });
            }

            this.logger.info(
                `Binding Node-Boot @ConfigurationProperties classes`,
            );
            for (const configurationPropertiesAdapter of context.configurationPropertiesAdapters) {
                configurationPropertiesAdapter.bind(
                    context.diOptions.iocContainer,
                );
            }

            // it's important to set container before any operation you do with routing-controllers,
            // including importing controllers
            this.logger.info(`Setting DI container`);
            useContainer(
                context.diOptions.iocContainer,
                context.diOptions.options,
            );
        }

        /* if (context.repositoriesAdapter && context.diOptions) {
            this.logger.info(`Binding persistence repositories`);
            context.repositoriesAdapter.bind(context.diOptions.iocContainer);
        }*/

        if (context.actuatorAdapter) {
            this.logger.info(`Binding Actuator endpoints`);
            context.actuatorAdapter.bind(
                {
                    serverType: this.serverType,
                    appName: context.applicationOptions.appName!,
                },
                this.getFramework(),
                this.getRouter(),
            );
        }

        if (context.openApi) {
            this.logger.info(`Binding OpenAPI adapter`);
            const openApiAdapter = context.openApi.bind(this.serverType);
            openApiAdapter.bind(
                {
                    basePath:
                        context.applicationOptions.apiOptions?.routePrefix,
                    controllers: context.controllerClasses,
                },
                framework,
                router,
            );
        }
    }

    private async loadConfig(context: ApplicationContext) {
        this.logger.info(`Loading Node-Boot configurations`);
        this.config = (
            await loadNodeBootConfig({
                argv: process.argv,
            })
        ).config;
        context.diOptions?.iocContainer.set(ConfigService, this.config);
        context.diOptions?.iocContainer.set("config", this.config);
    }

    private async initLogger(context: ApplicationContext) {
        this.logger = createLogger(
            context.applicationOptions.appName!,
            context.applicationOptions.platformName!,
        );
        this.logger.info(`Initializing Node-Boot logger`);
        context.diOptions?.iocContainer.set(Logger, this.logger);
        context.diOptions?.iocContainer.set("logger", this.logger);
    }
}
