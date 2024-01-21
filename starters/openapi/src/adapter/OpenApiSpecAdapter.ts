import {validationMetadatasToSchemas} from "class-validator-jsonschema";
import {OpenAPIObject, SchemaObject} from "openapi3-ts";
import {OpenApiOptions} from "@node-boot/context";
import {controllersToSpec} from "../spec";
import {NodeBootToolkit} from "@node-boot/engine";
import {parseDataClasses} from "../spec/dataClassParser";
import merge from "lodash.merge";

type OpenApiSpec = {
    spec: OpenAPIObject;
    options: {
        swaggerOptions: {
            url: string;
        };
    };
};

export class OpenApiSpecAdapter {
    static adapt(openApiOptions: OpenApiOptions): OpenApiSpec {
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

    static mergeSchemaObjects(
        obj1: Record<string, SchemaObject>,
        obj2: Record<string, SchemaObject>,
    ): Record<string, SchemaObject> {
        const result: Record<string, SchemaObject> = {...obj1};

        for (const key in obj2) {
            if (key in obj2) {
                if (key in result) {
                    // If the key already exists in result, merge the SchemaObjects
                    result[key] = {...result[key], ...obj2[key]};
                } else {
                    // If the key doesn't exist in result, add it
                    result[key] = {...obj2[key]};
                }
            }
        }
        return result;
    }
}
