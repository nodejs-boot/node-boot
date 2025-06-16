import {OpenApiOptions} from "@nodeboot/context";
import {BaseOpenApiAdapter} from "./BaseOpenApiAdapter";
import express, {Response} from "express";
import {generateSwaggerJsConfig, generateSwaggerUiHtml} from "../swagger-ui/ui";
import swaggerUiDist from "swagger-ui-dist";

export class ExpressOpenApi extends BaseOpenApiAdapter {
    constructor() {
        super("express");
    }

    async bind(openApiOptions: OpenApiOptions, _server: any, router: any) {
        const {spec, options} = await super.buildSpec(openApiOptions);

        const swaggerJsonPath = options.swaggerOptions.url || "/swagger.json";
        const swaggerUiPrefix = "/api-docs";

        router.get(swaggerJsonPath, (_: never, res: Response) => res.json(spec));

        // Serve swagger-config.js (external script to avoid CSP violation)
        router.get(`${swaggerUiPrefix}/swagger-config.js`, (_req, res) => {
            res.type("application/javascript").send(generateSwaggerJsConfig(swaggerJsonPath));
        });

        router.get(`${swaggerUiPrefix}/`, async (_req, res) => {
            res.send(generateSwaggerUiHtml());
        });

        router.use(swaggerUiPrefix, express.static(swaggerUiDist.getAbsoluteFSPath()));

        router.get("/docs", async (_req, reply) => {
            reply.redirect(302, `${swaggerUiPrefix}/`);
        });

        router.get(swaggerUiPrefix, async (_req, reply) => {
            reply.redirect(302, swaggerUiPrefix + "/");
        });
    }
}
