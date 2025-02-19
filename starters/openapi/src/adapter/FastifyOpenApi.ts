import {ApplicationContext, OpenApiOptions} from "@nodeboot/context";
import {FastifyInstance} from "fastify";
import {BaseOpenApiAdapter} from "./BaseOpenApiAdapter";

export class FastifyOpenApi extends BaseOpenApiAdapter {
    constructor() {
        super("fastify");
    }

    bind(openApiOptions: OpenApiOptions, server: FastifyInstance, router: FastifyInstance): void {
        const {spec, options} = super.buildSpec(openApiOptions);

        router.get(options.swaggerOptions.url, async (_, reply) => {
            reply.send(spec);
        });

        if (ApplicationContext.get().swaggerUI) {
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
}
