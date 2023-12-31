import {NodeBootToolkit} from "@node-boot/engine";
import {HandlerOptions} from "@node-boot/context";

/**
 * Registers a controller method to be executed when DELETE request comes on a given route.
 * Must be applied on a controller action.
 */
export function Delete(route?: RegExp, options?: HandlerOptions): Function;

/**
 * Registers a controller method to be executed when DELETE request comes on a given route.
 * Must be applied on a controller action.
 */
export function Delete(route?: string, options?: HandlerOptions): Function;

/**
 * Registers a controller method to be executed when DELETE request comes on a given route.
 * Must be applied on a controller action.
 */
export function Delete(route?: string | RegExp, options?: HandlerOptions): Function {
    return function (object: Object, methodName: string) {
        NodeBootToolkit.getMetadataArgsStorage().actions.push({
            type: "delete",
            target: object.constructor,
            method: methodName,
            route: route,
            options,
        });
    };
}
