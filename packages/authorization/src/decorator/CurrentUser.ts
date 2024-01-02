import {NodeBootToolkit} from "@node-boot/engine";

/**
 * Injects currently authorized user.
 * Authorization logic must be defined in Node-Boot settings.
 */
export function CurrentUser(options?: {required?: boolean}) {
    return function (object: Object, methodName: string, index: number) {
        NodeBootToolkit.getMetadataArgsStorage().params.push({
            type: "current-user",
            object: object,
            method: methodName,
            index: index,
            parse: false,
            required: options?.required ?? false,
        });
    };
}
