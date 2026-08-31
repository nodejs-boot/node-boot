import {ApplicationContext, OpenApiOptions} from "@nodeboot/context";
import {BaseOpenApiAdapter} from "./BaseOpenApiAdapter";
import {createReadStream, existsSync} from "fs";
import {Readable} from "stream";
import {join} from "path";
import swaggerUiDist from "swagger-ui-dist";
import type {Context, Hono} from "hono";
import {generateSwaggerJsConfig, generateSwaggerUiHtml, getContentType} from "../swagger-ui/ui";

export class HonoOpenApi extends BaseOpenApiAdapter {
    constructor() {
        super("hono");
    }

    async bind(openApiOptions: OpenApiOptions, server: Hono, _router: any) {
        const {spec, options} = await super.buildSpec(openApiOptions);

        const swaggerJsonPath = options.swaggerOptions.url || "/swagger.json";
        const swaggerUiPrefix = "/api-docs";

        // Serve spec JSON
        server.get(swaggerJsonPath, (c: Context) => c.json(spec));

        if (ApplicationContext.get().swaggerUI) {
            // Serve Swagger config as a separate JS file
            server.get(`${swaggerUiPrefix}/swagger-config.js`, (c: Context) => {
                c.header("Content-Type", "application/javascript");
                return c.body(generateSwaggerJsConfig(swaggerJsonPath));
            });

            // Serve index HTML
            server.get(`${swaggerUiPrefix}/`, (c: Context) => {
                c.header("Content-Type", "text/html");
                return c.body(generateSwaggerUiHtml());
            });

            // Serve static Swagger UI assets
            server.get(`${swaggerUiPrefix}/*`, (c: Context) => {
                const file = c.req.path.replace(`${swaggerUiPrefix}/`, "") || "index.html";
                const fullPath = join(swaggerUiDist.getAbsoluteFSPath(), file);

                if (!existsSync(fullPath)) {
                    return c.body("Not Found", 404);
                }

                c.header("Content-Type", getContentType(fullPath));
                return c.body(Readable.toWeb(createReadStream(fullPath)) as ReadableStream);
            });

            // Optional: redirect /docs → /api-docs/
            server.get("/docs", (c: Context) => c.redirect(`${swaggerUiPrefix}/`));

            server.get(swaggerUiPrefix, (c: Context) => c.redirect(`${swaggerUiPrefix}/`));
        }
    }
}
