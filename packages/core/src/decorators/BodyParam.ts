import {NodeBootToolkit} from "@node-boot/engine";
import {ParamOptions} from "@node-boot/context";

/**
 * Takes partial data of the request body.
 * Must be applied on a controller action parameter.
 */
export function BodyParam(name: string, options?: ParamOptions): Function {
    return function (object: Object, methodName: string, index: number) {
        NodeBootToolkit.getMetadataArgsStorage().params.push({
            type: "body-param",
            object: object,
            method: methodName,
            index: index,
            name: name,
            parse: options?.parse ?? false,
            required: options?.required ?? false,
            explicitType: options?.type ?? undefined,
            classTransform: options?.transform ?? undefined,
            validate: options?.validate ?? undefined,
        });
    };
}
