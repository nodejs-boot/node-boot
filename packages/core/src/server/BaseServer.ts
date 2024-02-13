import {ApiOptions, ApplicationContext, ApplicationOptions, useContainer} from "@node-boot/context";
import {Logger} from "winston";
import {createLogger} from "../logger";
import {ConfigService, loadNodeBootConfig} from "@node-boot/config";

export abstract class BaseServer<TFramework = any, TRouter = any> {
    protected logger: Logger;
    protected config: ConfigService;

    protected constructor(private readonly serverType: string) {}

    protected async init() {
        const context = ApplicationContext.get();
        await this.loadConfig(context);
        this.setupAppConfigs(context);
        await this.initLogger(context);
    }

    abstract listen();

    abstract getFramework(): TFramework;

    abstract getRouter(): TRouter;

    abstract run(): Promise<BaseServer>;

    protected async configure(framework: TFramework, router: TRouter) {
        // Initialize configuration and logging
        await this.init();

        this.logger.info(`Running Node-Boot application with '${this.serverType.toUpperCase()}'`);
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

            this.logger.info(`Binding Node-Boot @ConfigurationProperties classes`);
            for (const configurationPropertiesAdapter of context.configurationPropertiesAdapters) {
                configurationPropertiesAdapter.bind(context.diOptions.iocContainer);
            }

            // it's important to set container before any operation you do with Node-Boot,
            // including importing controllers
            this.logger.info(`Setting DI container`);
            useContainer(context.diOptions.iocContainer, context.diOptions.options);
        }

        if (context.actuatorAdapter) {
            this.logger.info(`Binding Actuator endpoints`);
            context.actuatorAdapter.bind(
                {
                    serverType: this.serverType,
                    appName: context.applicationOptions.name!,
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
                    basePath: context.applicationOptions.apiOptions?.routePrefix,
                    controllers: context.controllerClasses,
                },
                framework,
                router,
            );
        }
    }

    private setupAppConfigs(context: ApplicationContext) {
        const appConfigs = this.config.getOptional<ApplicationOptions>("node-boot.app");
        const apiConfigs = this.config.getOptional<ApiOptions>("node-boot.api");

        context.applicationOptions = {
            environment: context.applicationOptions?.environment ?? appConfigs?.environment ?? "development",
            port: context.applicationOptions?.port ?? appConfigs?.port ?? 3000,
            platform: context.applicationOptions?.platform ?? appConfigs?.platform ?? "node-boot",
            name: context.applicationOptions?.name ?? appConfigs?.name ?? "node-boot-app",
            apiOptions: context.applicationOptions.apiOptions ?? apiConfigs,
        };
    }

    private async loadConfig(context: ApplicationContext) {
        this.config = (
            await loadNodeBootConfig({
                argv: process.argv,
            })
        ).config;
        context.diOptions?.iocContainer.set(ConfigService, this.config);
        context.diOptions?.iocContainer.set("config", this.config);
    }

    private async initLogger(context: ApplicationContext) {
        this.logger = createLogger(context.applicationOptions.name!, context.applicationOptions.platform!);
        this.logger.info(`Initializing Node-Boot logger`);
        context.diOptions?.iocContainer.set(Logger, this.logger);
        context.diOptions?.iocContainer.set("logger", this.logger);
    }
}
