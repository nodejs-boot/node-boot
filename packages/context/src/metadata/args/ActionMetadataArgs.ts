import {HandlerOptions} from "../options";
import {Action, ActionType} from "../../types";

/**
 * Action metadata used to storage information about registered action.
 */
export interface ActionMetadataArgs {
    /**
     * Route to be registered for the action.
     */
    route?: string | RegExp;

    /**
     * Class on which's method this action is attached.
     */
    target: Function;

    /**
     * Object's method that will be executed on this action.
     */
    method: string;

    /**
     * Action-specific options.
     */
    options?: HandlerOptions;

    /**
     * Action type represents http method used for the registered route. Can be one of the value defined in ActionTypes
     * class.
     */
    type: ActionType;

    /**
     * Params to be appended to the method call.
     */
    appendParams?: (action: Action) => any[];
}
