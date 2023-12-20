import {NodeBootToolkit} from "@node-boot/engine";

/**
 * Sets response Content-Type.
 * Must be applied on a controller action.
 */
export function ContentType(contentType: string): Function {
    return function (object: Object, methodName: string) {
        NodeBootToolkit.getMetadataArgsStorage().responseHandlers.push({
            type: "content-type",
            target: object.constructor,
            method: methodName,
            value: contentType,
        });
    };
}
