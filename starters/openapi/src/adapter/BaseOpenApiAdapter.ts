import {validationMetadatasToSchemas} from "class-validator-jsonschema";
import {OpenAPIObject} from "openapi3-ts";
import {OpenApiAdapter, OpenApiOptions} from "@nodeboot/context";
import {controllersToSpec} from "../openapi";
import {NodeBootToolkit} from "@nodeboot/engine";
import {parseDataClasses} from "../openapi/dataClassParser";
import merge from "lodash.merge";

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

    abstract bind(options: OpenApiOptions, server: any, router: any): void;

    protected buildSpec(openApiOptions: OpenApiOptions): OpenApiSpec {
        const validationSchemas = validationMetadatasToSchemas({
            refPointerPrefix: "#/components/schemas/",
        });

        const dataCLasses = NodeBootToolkit.getMetadataArgsStorage().models.map(value => value.target);
        const dataClassSchemas = parseDataClasses(dataCLasses);

        const schemas = merge(validationSchemas, dataClassSchemas);

        const routingControllersOptions = {
            controllers: openApiOptions.controllers,
            routePrefix: openApiOptions.basePath,
        };

        const openApiSpec = controllersToSpec(
            routingControllersOptions,
            // FIXME - Move to configuration
            {
                info: {
                    description: "Generated with `Node-Boot`",
                    title: "A sample API",
                    version: "1.0.0",
                },
                components: {
                    schemas,
                    // FIXME - Move to configuration
                    securitySchemes: {
                        basicAuth: {
                            scheme: "basic",
                            type: "http",
                        },
                    },
                },
            },
        );

        const options = {
            swaggerOptions: {
                url: "/api-docs/swagger.json",
            },
        };
        return {
            options,
            spec: openApiSpec,
        };
    }
}
