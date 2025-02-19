import {ApplicationContext, OpenApiAdapter, OpenApiBridgeAdapter} from "@nodeboot/context";
import {ExpressOpenApi, FastifyOpenApi, KoaOpenApi} from "../adapter";

/**
 * Enables OenAPI auto-generation.
 * By decorating your application class with it, Node-Boot will automatically generate OpenAPI spec for registered controllers
 * and expose it through '/api-docs/swagger.json' path.
 *
 */
export function EnableOpenApi(): Function {
    return function () {
        ApplicationContext.get().openApi = new (class implements OpenApiBridgeAdapter {
            bind(serverType: string): OpenApiAdapter {
                switch (serverType) {
                    case "express":
                        return new ExpressOpenApi();
                    case "koa":
                        return new KoaOpenApi();
                    case "fastify":
                        return new FastifyOpenApi();
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
