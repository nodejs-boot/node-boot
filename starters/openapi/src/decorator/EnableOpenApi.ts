import {ApplicationContext, OpenApiAdapter, OpenApiBridgeAdapter} from "@nodeboot/context";
import {ExpressOpenApi, FastifyOpenApi, KoaOpenApi} from "../adapter";
import {HttpOpenApi} from "../adapter/HttpOpenApi";

/**
 * Enables OenAPI auto-generation.
 * By decorating your application class with it, Node-Boot will automatically generate OpenAPI spec for registered controllers
 * and expose it through '/api-docs/swagger.json' path.
 *
 */
export function EnableOpenApi(): Function {
    return function () {
        ApplicationContext.get().openApi = new (class implements OpenApiBridgeAdapter {
            async bind(serverType: string): Promise<OpenApiAdapter> {
                switch (serverType) {
                    case "express":
                        return new ExpressOpenApi();
                    case "koa":
                        return new KoaOpenApi();
                    case "fastify":
                        return new FastifyOpenApi();
                    case "native-http":
                        return new HttpOpenApi();
                    default:
                        throw new Error(
                            "OpenAPI feature is only allowed for 'express', 'koa' and 'fastify' servers. " +
                                "Please remove @EnableOpenApi from your application",
                        );
                }
            }
        })();
    };
}
