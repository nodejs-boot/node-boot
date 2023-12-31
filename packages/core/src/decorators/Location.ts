import {NodeBootToolkit} from "@node-boot/engine";

/**
 * Sets Location header with given value to the response.
 * Must be applied on a controller action.
 */
export function Location(url: string): Function {
    return function (object: Object, methodName: string) {
        NodeBootToolkit.getMetadataArgsStorage().responseHandlers.push({
            type: "location",
            target: object.constructor,
            method: methodName,
            value: url,
        });
    };
}
