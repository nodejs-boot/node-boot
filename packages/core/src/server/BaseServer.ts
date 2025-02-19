import {
    ApiOptions,
    ApplicationContext,
    ApplicationOptions,
    CoreInfoService,
    JsonObject,
    useContainer,
} from "@nodeboot/context";
import {Logger} from "winston";
import {createLogger} from "../logger";
import {ConfigService, loadNodeBootConfig} from "@nodeboot/config";
import {NodeBootAppView} from "./NodeBootApp";
import {SERVER_CONFIGURATIONS} from "../constants";
import {Server} from "node:http";

export abstract class BaseServer<TFramework = any, TRouter = any> {
    protected logger: Logger;
    protected config: ConfigService;
    protected infoService: CoreInfoService;

    protected constructor(private readonly serverType: string) {}

    protected async init(additionalConfigData?: JsonObject) {
        const context = ApplicationContext.get();
        context.serverType = this.serverType;
        await this.loadConfig(context, additionalConfigData);
        this.setupAppConfigs(context);
        await this.initLogger(context);
        await this.initInfoService(context);
        await this.printBanner();
    }

    abstract listen(): Promise<NodeBootAppView>;

    abstract close(): Promise<void>;

    abstract getHttpServer(): Server;

    abstract getFramework(): TFramework;

    abstract getRouter(): TRouter;

    abstract run(additionalConfig?: JsonObject): Promise<BaseServer>;

    protected async configure(framework: TFramework, router: TRouter, additionalConfigData?: JsonObject) {
        // Initialize configuration and logging
        await this.init(additionalConfigData);

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

    appView(): NodeBootAppView {
        return {
            appOptions: ApplicationContext.get().applicationOptions,
            server: this,
            config: this.config,
            logger: this.logger,
        };
    }

    protected getServerConfigurations<TServerConfigs>(): TServerConfigs | undefined {
        const iocContainer = ApplicationContext.get().diOptions?.iocContainer;
        return iocContainer?.has(SERVER_CONFIGURATIONS)
            ? ApplicationContext.get().diOptions?.iocContainer.get<TServerConfigs>(SERVER_CONFIGURATIONS)
            : undefined;
    }

    private setupAppConfigs(context: ApplicationContext) {
        const appConfigs = this.config.getOptional<ApplicationOptions>("app");
        const apiConfigs = this.config.getOptional<ApiOptions>("api");

        context.applicationOptions = {
            environment: context.applicationOptions?.environment ?? appConfigs?.environment ?? "development",
            port: context.applicationOptions?.port ?? appConfigs?.port ?? 3000,
            platform: context.applicationOptions?.platform ?? appConfigs?.platform ?? "node-boot",
            name: context.applicationOptions?.name ?? appConfigs?.name ?? "node-boot-app",
            apiOptions: context.applicationOptions.apiOptions ?? apiConfigs,
        };
    }

    private async loadConfig(context: ApplicationContext, additionalConfigData?: JsonObject) {
        this.config = (
            await loadNodeBootConfig({
                argv: process.argv,
                additionalConfigData,
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

    private async initInfoService(context: ApplicationContext) {
        this.logger.info(`Initializing Node-Boot Info Service`);
        this.infoService = new CoreInfoService(this.logger);
        context.diOptions?.iocContainer.set(CoreInfoService, this.infoService);
    }

    private async printBanner() {
        const banner =
            "_____   __     _________           ________            _____ \n" +
            "___  | / /___________  /____       ___  __ )_____________  /_\n" +
            "__   |/ /_  __ \\  __  /_  _ \\________  __  |  __ \\  __ \\  __/\n" +
            "_  /|  / / /_/ / /_/ / /  __//_____/  /_/ // /_/ / /_/ / /_  \n" +
            "/_/ |_/  \\____/\\__,_/  \\___/       /_____/ \\____/\\____/\\__/  \n" +
            "                                                             \n";

        const appConfig = this.config.getOptionalConfig("app");
        const info = await this.infoService.getInfo();
        const appName = appConfig?.getOptionalString("name") ?? info.build?.name ?? "Un-named App";
        const separator = "============================================================\n";
        this.logger.info(
            `\n${banner}${separator}Host: "${info.host}" Running Node "${info.nodeVersion}"\nWith App: "${appName}" version "${info.build?.version}"\nPowered by Node-Boot "${info.build?.nodeBoot}" (Running ${info.build?.serverFramework} version "${info.build?.serverVersion}")\n${separator}`,
        );
    }
}
