import {NodeBootToolkit} from "@nodeboot/engine";

/**
 * Injects all request's cookies to the controller action parameter.
 * Must be applied on a controller action parameter.
 */
export function CookieParams() {
    return function (object: Object, methodName: string, index: number) {
        NodeBootToolkit.getMetadataArgsStorage().params.push({
            type: "cookies",
            object: object,
            method: methodName,
            index: index,
            parse: false,
            required: false,
        });
    };
}
