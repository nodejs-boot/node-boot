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

        router.get(options.swaggerOptions.url, (_: never, res: Response) => res.json(spec));

        // 1. Serve the spec
        router.get("/swagger.json", async (_req, res) => res.json(spec));

        // Serve swagger-config.js (external script to avoid CSP violation)
        router.get(`/api-docs/swagger-config.js`, (_req, res) => {
            res.type("application/javascript").send(generateSwaggerJsConfig(options.swaggerOptions.url));
        });

        router.get("/api-docs/", async (_req, res) => {
            res.send(generateSwaggerUiHtml());
        });

        router.use("/api-docs", express.static(swaggerUiDist.getAbsoluteFSPath()));
    }
}
