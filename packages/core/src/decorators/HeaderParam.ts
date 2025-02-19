import {NodeBootToolkit} from "@nodeboot/engine";
import {ParamOptions} from "@nodeboot/context";

/**
 * Injects a request's http header value to the controller action parameter.
 * Must be applied on a controller action parameter.
 */
export function HeaderParam(name: string, options?: ParamOptions): Function {
    return function (object: Object, methodName: string, index: number) {
        NodeBootToolkit.getMetadataArgsStorage().params.push({
            type: "header",
            object: object,
            method: methodName,
            index: index,
            name: name,
            parse: options?.parse ?? false,
            required: options?.required ?? false,
            classTransform: options?.transform ?? undefined,
            explicitType: options?.type ?? undefined,
            validate: options?.validate ?? undefined,
        });
    };
}
