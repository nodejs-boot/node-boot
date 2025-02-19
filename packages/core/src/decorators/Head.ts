import {NodeBootToolkit} from "@nodeboot/engine";
import {HandlerOptions} from "@nodeboot/context";

/**
 * Registers an action to be executed when HEAD request comes on a given route.
 * Must be applied on a controller action.
 */
export function Head(route?: RegExp, options?: HandlerOptions): Function;

/**
 * Registers an action to be executed when HEAD request comes on a given route.
 * Must be applied on a controller action.
 */
export function Head(route?: string, options?: HandlerOptions): Function;

/**
 * Registers an action to be executed when HEAD request comes on a given route.
 * Must be applied on a controller action.
 */
export function Head(route?: string | RegExp, options?: HandlerOptions): Function {
    return function (object: Object, methodName: string) {
        NodeBootToolkit.getMetadataArgsStorage().actions.push({
            type: "head",
            target: object.constructor,
            method: methodName,
            options,
            route,
        });
    };
}
