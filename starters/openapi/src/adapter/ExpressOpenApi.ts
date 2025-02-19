import {ApplicationContext, OpenApiOptions} from "@nodeboot/context";
import swaggerUi from "swagger-ui-express";
import {BaseOpenApiAdapter} from "./BaseOpenApiAdapter";
import {Response} from "express";

export class ExpressOpenApi extends BaseOpenApiAdapter {
    constructor() {
        super("express");
    }

    bind(openApiOptions: OpenApiOptions, server: any, router: any): void {
        const {spec, options} = super.buildSpec(openApiOptions);

        router.get(options.swaggerOptions.url, (_: never, res: Response) => res.json(spec));

        if (ApplicationContext.get().swaggerUI) {
            if (swaggerUi?.serve) {
                server.use("/api-docs", swaggerUi.serve, swaggerUi.setup(spec, options));
            } else {
                throw new Error(
                    "Unable to initialize Swagger UI. 'swagger-ui-express' dependency is missing. " +
                        "Please add it to your project by running:" +
                        "\nnpm install swagger-ui-express" +
                        "\nyarn add swagger-ui-express" +
                        "\n or pnpm swagger-ui-express",
                );
            }
        }
    }
}
