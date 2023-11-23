import { ApplicationContext } from "@node-boot/context";
import * as oa from "openapi3-ts";
import { ExpressOpenApi } from "../adapter";

/**
 * Defines the configurations to enable Swagger Open API
 *
 * @param openApi The OpenAPI definitions and base config
 */
export function EnableOpenApi(
  openApi: Partial<oa.OpenAPIObject> = {}
): Function {
  return function (object: Function) {
    ApplicationContext.get().openApi = new ExpressOpenApi();
  };
}
