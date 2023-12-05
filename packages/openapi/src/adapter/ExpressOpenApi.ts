import {OpenApiAdapter, OpenApiOptions} from "@node-boot/context";
import swaggerUi from "swagger-ui-express";
import {OpenApiSpecAdapter} from "./OpenApiSpecAdapter";

export class ExpressOpenApi implements OpenApiAdapter {
    bind(openApiOptions: OpenApiOptions, server: any, router: any): void {
        if (swaggerUi?.serve) {
            const {spec, options} = OpenApiSpecAdapter.adapt(openApiOptions);

            router.get(options.swaggerOptions.url, (req, res) => res.json(spec));
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
