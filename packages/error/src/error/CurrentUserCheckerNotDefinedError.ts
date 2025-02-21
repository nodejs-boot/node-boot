import {InternalServerError} from "../http-error";

/**
 * Thrown when currentUserChecker function is not defined in Node-Boot options.
 */
export class CurrentUserCheckerNotDefinedError extends InternalServerError {
    override name = "CurrentUserCheckerNotDefinedError";

    constructor() {
        super(
            `Cannot use @CurrentUser decorator. Please define currentUserChecker function in Node-Boot action before using it.`,
        );
        Object.setPrototypeOf(this, CurrentUserCheckerNotDefinedError.prototype);
    }
}
