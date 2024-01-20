import _merge from "lodash.merge";
import {OperationObject} from "openapi3-ts";
import "reflect-metadata";
import {IRoute} from "../types";
import {OPEN_API_KEY, OpenAPIParam} from "../decorator/OpenAPI";

/**
 * Apply the keywords defined in @OpenAPI decorator to its target route.
 */
export function applyOpenAPIMetadata(originalOperation: OperationObject, route: IRoute): OperationObject {
    const {action} = route;
    const openAPIParams = [
        ...getOpenAPIMetadata(action.target),
        ...getOpenAPIMetadata(action.target.prototype, action.method),
    ];

    return openAPIParams.reduce((acc: OperationObject, oaParam: OpenAPIParam) => {
        return typeof oaParam === "function" ? oaParam(acc, route) : _merge({}, acc, oaParam);
    }, originalOperation) as OperationObject;
}

/**
 * Get the OpenAPI Operation object stored in given target property's metadata.
 */
export function getOpenAPIMetadata(target: object, key?: string): OpenAPIParam[] {
    return (
        (key
            ? Reflect.getMetadata(OPEN_API_KEY, target.constructor, key)
            : Reflect.getMetadata(OPEN_API_KEY, target)) || []
    );
}

/**
 * Store given OpenAPI Operation object into target property's metadata.
 */
export function setOpenAPIMetadata(value: OpenAPIParam[], target: object, key?: string) {
    return key
        ? Reflect.defineMetadata(OPEN_API_KEY, value, target.constructor, key)
        : Reflect.defineMetadata(OPEN_API_KEY, value, target);
}
