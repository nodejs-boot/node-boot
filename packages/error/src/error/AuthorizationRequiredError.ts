import {UnauthorizedError} from "../http-error/UnauthorizedError";

/**
 * Thrown when authorization is required thought @CurrentUser decorator.
 */
export class AuthorizationRequiredError extends UnauthorizedError {
    override name = "AuthorizationRequiredError";

    constructor(method: string, url: string) {
        super();
        Object.setPrototypeOf(this, AuthorizationRequiredError.prototype);
        const uri = `${method} ${url}`;
        this.message = `Authorization is required for request on ${uri}`;
    }
}
