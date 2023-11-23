import {
  ApplicationContext,
  OpenApiAdapter,
  OpenApiBridgeAdapter
} from "@node-boot/context";
import * as oa from "openapi3-ts";
import { ExpressOpenApi } from "../adapter";
import { KoaOpenApi } from "../adapter/KoaOpenApi";
import { FastifyOpenApi } from "../adapter/FastifyOpenApi";

/**
 * Defines the configurations to enable Swagger Open API
 *
 * @param openApi The OpenAPI definitions and base config
 */
export function EnableOpenApi(
  openApi: Partial<oa.OpenAPIObject> = {}
): Function {
  return function (object: Function) {
    ApplicationContext.get().openApi = new (class
      implements OpenApiBridgeAdapter
    {
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
              "OpenAPI feature is only allowed for express and koa servers. " +
                "Please remove @EnableOpenApi from your application"
            );
        }
      }
    })();
  };
}
