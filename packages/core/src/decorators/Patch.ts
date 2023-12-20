import {NodeBootToolkit} from "@node-boot/engine";
import {HandlerOptions} from "@node-boot/context";

/**
 * Registers an action to be executed when PATCH request comes on a given route.
 * Must be applied on a controller action.
 */
export function Patch(route?: RegExp, options?: HandlerOptions): Function;

/**
 * Registers an action to be executed when PATCH request comes on a given route.
 * Must be applied on a controller action.
 */
export function Patch(route?: string, options?: HandlerOptions): Function;

/**
 * Registers an action to be executed when PATCH request comes on a given route.
 * Must be applied on a controller action.
 */
export function Patch(route?: string | RegExp, options?: HandlerOptions): Function {
    return function (object: Object, methodName: string) {
        NodeBootToolkit.getMetadataArgsStorage().actions.push({
            type: "patch",
            target: object.constructor,
            method: methodName,
            route: route,
            options,
        });
    };
}
