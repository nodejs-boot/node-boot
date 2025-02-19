import {NodeBootToolkit} from "@nodeboot/engine";
import {ParamOptions} from "@nodeboot/context";

/**
 * Injects all request's query parameters to the controller action parameter.
 * Must be applied on a controller action parameter.
 */
export function QueryParams(options?: ParamOptions): Function {
    return function (object: Object, methodName: string, index: number) {
        NodeBootToolkit.getMetadataArgsStorage().params.push({
            type: "queries",
            object: object,
            method: methodName,
            index: index,
            name: "",
            parse: options?.parse ?? false,
            required: options?.required ?? false,
            classTransform: options?.transform ?? undefined,
            explicitType: options?.type ?? undefined,
            validate: options?.validate ?? undefined,
        });
    };
}
