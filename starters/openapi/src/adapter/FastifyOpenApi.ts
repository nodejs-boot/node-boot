import {ApplicationContext, OpenApiOptions} from "@nodeboot/context";
import {FastifyInstance} from "fastify";
import swaggerUiDist from "swagger-ui-dist";
import {BaseOpenApiAdapter} from "./BaseOpenApiAdapter";
import {generateSwaggerJsConfig, generateSwaggerUiHtml} from "../swagger-ui/ui";

export class FastifyOpenApi extends BaseOpenApiAdapter {
    constructor() {
        super("fastify");
    }

    async bind(openApiOptions: OpenApiOptions, server: FastifyInstance, router: FastifyInstance) {
        const {spec, options} = await super.buildSpec(openApiOptions);

        const swaggerJsonPath = options.swaggerOptions.url || "/swagger.json";
        const swaggerUiPrefix = "/api-docs";

        router.get(swaggerJsonPath, async (_req, reply) => {
            reply.type("application/json").send(spec);
        });

        if (ApplicationContext.get().swaggerUI) {
            router.get(`${swaggerUiPrefix}/`, async (_req, reply) => {
                reply.type("text/html").send(generateSwaggerUiHtml());
            });

            server.register(require("@fastify/static"), {
                root: swaggerUiDist.getAbsoluteFSPath(),
                prefix: swaggerUiPrefix + "/",
                decorateReply: false,
            });

            router.get(`${swaggerUiPrefix}/swagger-config.js`, async (_req, reply) => {
                reply.type("application/javascript").send(generateSwaggerJsConfig(swaggerJsonPath));
            });

            router.get("/docs", async (_req, reply) => {
                reply.redirect(302, swaggerUiPrefix + "/");
            });

            router.get(swaggerUiPrefix, async (_req, reply) => {
                reply.redirect(302, swaggerUiPrefix + "/");
            });
        }
    }
}
