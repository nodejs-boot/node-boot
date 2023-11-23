import { OpenApiAdapter } from "@node-boot/context";
import { validationMetadatasToSchemas } from "class-validator-jsonschema";
import { getMetadataArgsStorage } from "routing-controllers";
import { routingControllersToSpec } from "routing-controllers-openapi";
import swaggerUi from "swagger-ui-express";

export class ExpressOpenApi implements OpenApiAdapter {
  bind(router: any, controllers: Function[]): void {
    const schemas = validationMetadatasToSchemas({
      // classTransformerMetadataStorage: defaultMetadataStorage,
      refPointerPrefix: "#/components/schemas/"
    });

    const routingControllersOptions = {
      controllers: controllers
    };

    const storage = getMetadataArgsStorage();
    const openApiSpec = routingControllersToSpec(
      storage,
      routingControllersOptions,
      {
        info: {
          description: "Generated with `routing-controllers-openapi`",
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

    router.get("/api-docs/swagger.json", (req, res) => res.json(openApiSpec));
    router.use(
      "/api-docs",
      swaggerUi.serve,
      swaggerUi.setup(openApiSpec, options)
    );
  }
}
