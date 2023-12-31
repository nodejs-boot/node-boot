import {NodeBootToolkit} from "@node-boot/engine";
import {HandlerOptions} from "@node-boot/context";

/**
 * Registers an action to be executed when POST request comes on a given route.
 * Must be applied on a controller action.
 */
export function Post(route?: RegExp, options?: HandlerOptions): Function;

/**
 * Registers an action to be executed when POST request comes on a given route.
 * Must be applied on a controller action.
 */
export function Post(route?: string, options?: HandlerOptions): Function;

/**
 * Registers an action to be executed when POST request comes on a given route.
 * Must be applied on a controller action.
 */
export function Post(route?: string | RegExp, options?: HandlerOptions): Function {
    return function (object: Object, methodName: string) {
        NodeBootToolkit.getMetadataArgsStorage().actions.push({
            type: "post",
            target: object.constructor,
            method: methodName,
            options,
            route,
        });
    };
}
