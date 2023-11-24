import {OpenApiAdapter, OpenApiOptions} from "@node-boot/context";
import {FastifyInstance} from "fastify";
import {OpenApiSpecAdapter} from "./OpenApiSpecAdapter";

export class FastifyOpenApi implements OpenApiAdapter {
    bind(
        openApiOptions: OpenApiOptions,
        server: FastifyInstance,
        router: FastifyInstance,
    ): void {
        const {spec, options} = OpenApiSpecAdapter.adapt(openApiOptions);

        router.get(options.swaggerOptions.url, async (request, reply) => {
            reply.send(spec);
        });
        server.register(require("@fastify/swagger"), {
            mode: "static",
            specification: {
                document: spec,
            },
            exposeRoute: false,
        });
        server.register(require("@fastify/swagger-ui"), {
            routePrefix: "/api-docs",
            uiConfig: {
                // FIXME - Move to configuration
                docExpansion: "list",
                deepLinking: false,
                displayOperationId: true,
                defaultModelsExpandDepth: 1,
                filter: true,
                defaultModelRendering: "example",
            },
        });
    }
}
