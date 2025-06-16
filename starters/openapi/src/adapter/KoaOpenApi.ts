import {ApplicationContext, OpenApiOptions} from "@nodeboot/context";
import {BaseOpenApiAdapter} from "./BaseOpenApiAdapter";
import {generateSwaggerJsConfig, generateSwaggerUiHtml, getContentType} from "../swagger-ui/ui";
import {createReadStream, existsSync} from "fs";
import {join} from "path";
import swaggerUiDist from "swagger-ui-dist";
import type {Context} from "koa";

export class KoaOpenApi extends BaseOpenApiAdapter {
    constructor() {
        super("koa");
    }

    async bind(openApiOptions: OpenApiOptions, _server: any, router: any) {
        const {spec, options} = await super.buildSpec(openApiOptions);

        const swaggerJsonPath = options.swaggerOptions.url || "/swagger.json";
        const swaggerUiPrefix = "/api-docs";

        // Serve spec JSON
        router.get(swaggerJsonPath, async (ctx: Context) => {
            ctx.set("Content-Type", "application/json");
            ctx.body = spec;
        });

        if (ApplicationContext.get().swaggerUI) {
            // Serve Swagger config as a separate JS file
            router.get(`${swaggerUiPrefix}/swagger-config.js`, async (ctx: Context) => {
                ctx.set("Content-Type", "application/javascript");
                ctx.body = generateSwaggerJsConfig(swaggerJsonPath);
            });

            // Serve index HTML
            router.get(`${swaggerUiPrefix}/`, async (ctx: Context) => {
                ctx.set("Content-Type", "text/html");
                ctx.body = generateSwaggerUiHtml();
            });

            // Serve static Swagger UI assets
            router.get(`${swaggerUiPrefix}/:file(.*)`, async (ctx: Context) => {
                const file = ctx["params"].file || "index.html";
                const fullPath = join(swaggerUiDist.getAbsoluteFSPath(), file);

                if (!existsSync(fullPath)) {
                    ctx.status = 404;
                    ctx.body = "Not Found";
                    return;
                }

                ctx.set("Content-Type", getContentType(fullPath));
                ctx.body = createReadStream(fullPath);
            });

            // Optional: redirect /docs → /api-docs/
            router.get("/docs", async (ctx: Context) => {
                ctx.redirect(`${swaggerUiPrefix}/`);
            });

            router.get(swaggerUiPrefix, async (ctx: Context) => {
                ctx.redirect(`${swaggerUiPrefix}/`);
            });
        }
    }
}
