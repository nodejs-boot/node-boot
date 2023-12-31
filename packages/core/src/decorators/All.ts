import {NodeBootToolkit} from "@node-boot/engine";
import {ControllerOptions} from "@node-boot/context";

/**
 * Registers an action to be executed when a request comes on a given route.
 * Must be applied on a controller action.
 */
export function All(route?: RegExp): Function;

/**
 * Registers an action to be executed when a request comes on a given route.
 * Must be applied on a controller action.
 */
export function All(route?: string): Function;

/**
 * Registers an action to be executed when a request comes on a given route.
 * Must be applied on a controller action.
 */
export function All(route?: string | RegExp, options?: ControllerOptions): Function {
    return function (object: Object, methodName: string) {
        NodeBootToolkit.getMetadataArgsStorage().actions.push({
            type: "all",
            target: object.constructor,
            method: methodName,
            route: route,
            options,
        });
    };
}
