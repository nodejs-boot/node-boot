import _merge from "lodash.merge";
import * as oa from "openapi3-ts";
import {NodeBootEngineOptions} from "@node-boot/context";
import {getSpec} from "./generateSpec";
import {parseRoutes} from "./parseRoutes";
import {NodeBootToolkit} from "@node-boot/engine";

/**
 * Convert Node-Boot controllers metadata into an OpenAPI specification.
 *
 * @param engineOptions Node-Boot engine options
 * @param additionalProperties Additional OpenAPI Spec properties
 */
export function controllersToSpec(
    engineOptions: NodeBootEngineOptions = {},
    additionalProperties: Partial<oa.OpenAPIObject> = {},
): oa.OpenAPIObject {
    const storage = NodeBootToolkit.getMetadataArgsStorage();
    const routes = parseRoutes(storage, engineOptions);
    const spec = getSpec(routes, additionalProperties.components?.schemas || {});

    return _merge(spec, additionalProperties);
}
