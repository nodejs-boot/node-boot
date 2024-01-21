import {OperationObject} from "openapi3-ts";
import "reflect-metadata";
import {getOpenAPIMetadata, setOpenAPIMetadata} from "../metadata";
import {IRoute} from "../types";

export const OPEN_API_KEY = Symbol("node-boot:OpenAPI");

export type OpenAPIParam = Partial<OperationObject> | ((source: OperationObject, route: IRoute) => OperationObject);

/**
 * Supplement action with additional OpenAPI Operation keywords.
 *
 * @param spec OpenAPI Operation object that is merged into the schema derived
 * from Node-Boot decorators. In case of conflicts, keywords defined
 * here overwrite the existing ones. Alternatively you can supply a function
 * that receives as parameters the existing Operation and target route,
 * returning an updated Operation.
 */
export function OpenAPI(spec: OpenAPIParam) {
    return (...args: [Function] | [object, string, PropertyDescriptor]) => {
        if (args.length === 1) {
            const [target] = args;
            const currentMeta = getOpenAPIMetadata(target);
            setOpenAPIMetadata([spec, ...currentMeta], target);
        } else {
            const [target, key] = args;
            const currentMeta = getOpenAPIMetadata(target, key);
            setOpenAPIMetadata([spec, ...currentMeta], target, key);
        }
    };
}
