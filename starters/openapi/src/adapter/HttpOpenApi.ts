import {ApplicationContext, OpenApiOptions} from "@nodeboot/context";
import {BaseOpenApiAdapter} from "./BaseOpenApiAdapter";
import {IncomingMessage, ServerResponse} from "http";
import {createReadStream, existsSync} from "fs";
import {join} from "path";
import swaggerUiDist from "swagger-ui-dist";
import {generateSwaggerJsConfig, generateSwaggerUiHtml, getContentType} from "../swagger-ui/ui";

export class HttpOpenApi extends BaseOpenApiAdapter {
    constructor() {
        super("native-http");
    }

    async bind(openApiOptions: OpenApiOptions, _server: any, router: any) {
        const {spec, options} = await super.buildSpec(openApiOptions);

        const swaggerJsonPath = options.swaggerOptions.url || "/swagger.json";
        const swaggerUiPrefix = "/api-docs";

        // 1. Serve OpenAPI spec JSON
        router.on("GET", swaggerJsonPath, (_req: IncomingMessage, res: ServerResponse) => {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(spec));
        });

        // 2. Serve Swagger UI if enabled
        if (ApplicationContext.get().swaggerUI) {
            // 2a. Serve custom index.html with injected spec URL and options
            router.on("GET", `${swaggerUiPrefix}/`, (_req: IncomingMessage, res: ServerResponse) => {
                const html = generateSwaggerUiHtml();
                res.setHeader("Content-Type", "text/html");
                res.end(html);
            });

            // 2b. Serve static Swagger UI assets
            router.on("GET", `${swaggerUiPrefix}/*`, (req: IncomingMessage, res: ServerResponse) => {
                const reqUrl = req.url?.replace(`${swaggerUiPrefix}/`, "") || "index.html";
                const filePath = join(swaggerUiDist.getAbsoluteFSPath(), reqUrl);

                if (!existsSync(filePath)) {
                    res.statusCode = 404;
                    res.end("Not Found");
                    return;
                }

                res.setHeader("Content-Type", getContentType(filePath));
                createReadStream(filePath).pipe(res);
            });

            // Serve swagger-config.js (external script to avoid CSP violation)
            router.on("GET", `${swaggerUiPrefix}/swagger-config.js`, (_req: IncomingMessage, res: ServerResponse) => {
                res.setHeader("Content-Type", "application/javascript");
                res.end(generateSwaggerJsConfig(swaggerJsonPath));
            });

            // Optional redirect: /docs → /api-docs/
            router.on("GET", "/docs", (_req: IncomingMessage, res: ServerResponse) => {
                res.statusCode = 302;
                res.setHeader("Location", `${swaggerUiPrefix}/`);
                res.end();
            });
        }
    }
}
