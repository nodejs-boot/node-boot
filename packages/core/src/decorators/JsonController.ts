import {NodeBootToolkit} from "@node-boot/engine";
import {ControllerOptions} from "@node-boot/context";

/**
 * Defines a class as a JSON controller. If JSON controller is used, then all controller actions will return
 * a serialized json data, and its response content-type always will be application/json.
 *
 * @param baseRoute Extra path you can apply as a base route to all controller actions
 * @param options Extra options that apply to all controller actions
 *
 * @deprecated
 * FIXME move the json behaviour to the @Controller and delete this decorator
 */
export function JsonController(baseRoute?: string, options?: ControllerOptions) {
    return function (object: Function) {
        NodeBootToolkit.getMetadataArgsStorage().controllers.push({
            type: "json",
            target: object,
            route: baseRoute,
            options,
        });
    };
}
