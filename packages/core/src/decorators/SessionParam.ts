import {NodeBootToolkit} from "@nodeboot/engine";
import {ParamOptions} from "@nodeboot/context";

/**
 * Injects a Session object property to the controller action parameter.
 * Must be applied on a controller action parameter.
 */
export function SessionParam(propertyName: string, options?: ParamOptions): Function {
    return function (object: Object, methodName: string, index: number) {
        NodeBootToolkit.getMetadataArgsStorage().params.push({
            type: "session-param",
            object: object,
            method: methodName,
            index: index,
            name: propertyName,
            parse: false, // it makes no sense for Session object to be parsed as json
            required: options?.required ?? false,
            classTransform: options?.transform,
            validate: options?.validate ?? false,
        });
    };
}
