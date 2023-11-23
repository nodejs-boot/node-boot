import { validationMetadatasToSchemas } from "class-validator-jsonschema";
import { getMetadataArgsStorage } from "routing-controllers";
import { routingControllersToSpec } from "routing-controllers-openapi";
import { OpenAPIObject } from "openapi3-ts";
import { OpenApiOptions } from "@node-boot/context";

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
    const schemas = validationMetadatasToSchemas({
      // classTransformerMetadataStorage: defaultMetadataStorage,
      refPointerPrefix: "#/components/schemas/"
    });

    const routingControllersOptions = {
      controllers: openApiOptions.controllers,
      routePrefix: openApiOptions.basePath
    };

    const storage = getMetadataArgsStorage();
    const openApiSpec = routingControllersToSpec(
      storage,
      routingControllersOptions,
      {
        info: {
          description: "Generated with `Node-Boot`",
          title: "A sample API",
          version: "1.0.0"
        },
        components: {
          schemas,
          securitySchemes: {
            basicAuth: {
              scheme: "basic",
              type: "http"
            }
          }
        }
      }
    );

    const options = {
      swaggerOptions: {
        url: "/api-docs/swagger.json"
      }
    };
    return {
      options,
      spec: openApiSpec
    };
  }
}
