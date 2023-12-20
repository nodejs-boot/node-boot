import {NodeBootToolkit} from "@node-boot/engine";

/**
 * Sets Redirect header with given value to the response.
 * Must be applied on a controller action.
 */
export function Redirect(url: string): Function {
    return function (object: Object, methodName: string) {
        NodeBootToolkit.getMetadataArgsStorage().responseHandlers.push({
            type: "redirect",
            target: object.constructor,
            method: methodName,
            value: url,
        });
    };
}
