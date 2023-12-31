import {NodeBootToolkit} from "@node-boot/engine";
import {ParamOptions} from "@node-boot/context";

/**
 * Injects a request's query parameter value to the controller action parameter.
 * Must be applied on a controller action parameter.
 */
export function QueryParam(name: string, options?: ParamOptions): Function {
    return function (object: Object, methodName: string, index: number) {
        NodeBootToolkit.getMetadataArgsStorage().params.push({
            type: "query",
            object: object,
            method: methodName,
            index: index,
            name: name,
            parse: options?.parse ?? false,
            required: options?.required ?? false,
            classTransform: options?.transform ?? undefined,
            explicitType: options?.type ?? undefined,
            validate: options?.validate ?? undefined,
            isArray: options?.isArray ?? false,
        });
    };
}
