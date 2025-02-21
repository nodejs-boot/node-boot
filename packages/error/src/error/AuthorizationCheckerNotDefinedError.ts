import {InternalServerError} from "../http-error/InternalServerError";

/**
 * Thrown when authorizationChecker function is not defined in Node-Boot options.
 */
export class AuthorizationCheckerNotDefinedError extends InternalServerError {
    override name = "AuthorizationCheckerNotDefinedError";

    constructor() {
        super(
            `Cannot use @Authorized decorator. Please define authorizationChecker function in Node-Boot action before using it.`,
        );
        Object.setPrototypeOf(this, AuthorizationCheckerNotDefinedError.prototype);
    }
}
