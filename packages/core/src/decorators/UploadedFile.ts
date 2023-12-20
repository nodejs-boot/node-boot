import {NodeBootToolkit} from "@node-boot/engine";
import {UploadOptions} from "@node-boot/context";

/**
 * Injects an uploaded file object to the controller action parameter.
 * Must be applied on a controller action parameter.
 */
export function UploadedFile(name: string, options?: UploadOptions): Function {
    return function (object: Object, methodName: string, index: number) {
        NodeBootToolkit.getMetadataArgsStorage().params.push({
            type: "file",
            object: object,
            method: methodName,
            index: index,
            name: name,
            parse: false,
            required: options?.required ?? false,
            extraOptions: options?.options ?? undefined,
        });
    };
}
