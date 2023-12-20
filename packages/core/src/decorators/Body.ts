import {NodeBootToolkit} from "@node-boot/engine";
import {BodyOptions} from "@node-boot/context";

/**
 * Allows to inject a request body value to the controller action parameter.
 * Must be applied on a controller action parameter.
 */
export function Body(options?: BodyOptions): Function {
    return function (object: Object, methodName: string, index: number) {
        NodeBootToolkit.getMetadataArgsStorage().params.push({
            type: "body",
            object: object,
            method: methodName,
            index: index,
            parse: false,
            required: options?.required ?? false,
            classTransform: options?.transform ?? undefined,
            validate: options?.validate ?? undefined,
            explicitType: options?.type ?? undefined,
            extraOptions: options?.options ?? undefined,
        });
    };
}
