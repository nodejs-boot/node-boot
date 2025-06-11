import fs from "fs";
import path from "path";
import {validationMetadatasToSchemas} from "class-validator-jsonschema";
import {InfoObject, OpenAPIObject} from "openapi3-ts";
import {
    ApplicationContext,
    Config,
    CoreInfoService,
    IocContainer,
    LoggerService,
    OpenApiAdapter,
    OpenApiOptions,
} from "@nodeboot/context";
import {controllersToSpec} from "../openapi";
import merge from "lodash.merge";
import {OpenApiConfigProperties} from "../properties";
import {NodeBootToolkit} from "@nodeboot/engine";
import {Model, parseDataClasses} from "../openapi/dataClassParser";

type OpenApiSpec = {
    spec: OpenAPIObject;
    options: {
        swaggerOptions: {
            url: string;
        };
    };
};

export abstract class BaseOpenApiAdapter implements OpenApiAdapter {
    protected constructor(readonly name: string) {}

    abstract bind(options: OpenApiOptions, server: any, router: any): Promise<void>;

    protected async buildSpec(openApiOptions: OpenApiOptions): Promise<OpenApiSpec> {
        const openApiConfig = this.getConfig(openApiOptions);

        const validationSchemas = validationMetadatasToSchemas({
            refPointerPrefix: "#/components/schemas/",
        });

        const dataCLasses = NodeBootToolkit.getMetadataArgsStorage().models.map(value => value.target);
        const dataClassSchemas = parseDataClasses(dataCLasses as Model[]);
        const precompiledSchema = await this.loadPreCompiled(openApiOptions.logger);

        const schemas = merge({}, dataClassSchemas, validationSchemas, precompiledSchema);

        // Clear models and model properties since they won't be needed after schema generation
        NodeBootToolkit.getMetadataArgsStorage().models = [];
        NodeBootToolkit.getMetadataArgsStorage().modelProperties = [];

        const routingControllersOptions = {
            controllers: openApiOptions.controllers,
            routePrefix: openApiOptions.basePath,
        };

        const openApiSpec = controllersToSpec(routingControllersOptions, {
            info: await this.getInfo(openApiOptions.iocContainer, openApiConfig),
            tags: openApiConfig?.tags ?? [],
            externalDocs: openApiConfig?.externalDocs ?? undefined,
            security: openApiConfig?.security ?? [],
            servers: openApiConfig?.servers ?? [],
            components: {
                schemas,
                securitySchemes: openApiConfig?.securitySchemes ?? undefined,
            },
        });

        const options = {
            swaggerOptions: {
                url: "/api-docs/swagger.json",
            },
        };

        this.logInitialization(openApiOptions.logger);
        return {
            options,
            spec: openApiSpec,
        };
    }

    private async loadPreCompiled(logger: LoggerService) {
        let precompiledModelSchemas = {};
        try {
            const basePath = process.cwd().includes("dist") ? process.cwd() : path.resolve(process.cwd(), "dist");

            const modelsFilePath = path.join(basePath, "node-boot-models.json");
            if (fs.existsSync(modelsFilePath)) {
                const modelsJson = JSON.parse(fs.readFileSync(modelsFilePath, "utf-8"));
                if (modelsJson?.components?.schemas) {
                    precompiledModelSchemas = modelsJson.components.schemas;
                    logger.info(
                        `📦 Loaded ${Object.keys(precompiledModelSchemas).length} models from node-boot-models.json`,
                    );
                }
            } else {
                logger.warn(`⚠️ node-boot-models.json not found. Using live-parsed models.`);
            }
        } catch (error: any) {
            logger.warn(`⚠️ Failed to load node-boot-models.json. Falling back to runtime parsing.`, error);
        }
        return precompiledModelSchemas;
    }

    private async getInfo(iocContainer: IocContainer, openApiConfig?: OpenApiConfigProperties): Promise<InfoObject> {
        const infoService = iocContainer.get(CoreInfoService);
        const buildInfo = await infoService.getBuild();
        return {
            version: buildInfo?.version ?? "1.0.0",
            description: buildInfo?.description,
            title: buildInfo?.name ?? "Node-Boot Application",
            ...openApiConfig?.info,
        };
    }

    private getConfig(openApiOptions: OpenApiOptions): OpenApiConfigProperties | undefined {
        try {
            const config = openApiOptions.iocContainer.get<Config>("config");
            return config.get<OpenApiConfigProperties>("openapi");
        } catch (e) {
            openApiOptions.logger.warn(
                `Unable to load configurations for OpenAPI. To configure OpenAPI, please add configs to the "openapi" config path in the app-config.yaml file`,
            );
            return undefined;
        }
    }

    private logInitialization(logger: LoggerService) {
        logger.info(
            `=====> 🌈 Swagger UI is Live :) = http://localhost:${
                ApplicationContext.get().applicationOptions.port
            }/api-docs`,
        );
        logger.info(
            `=====> 🔌 OpenAPI Spec is Live :) = http://localhost:${
                ApplicationContext.get().applicationOptions.port
            }/api-docs/swagger.json`,
        );
    }
}
