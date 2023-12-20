import {ForbiddenError} from "../http-error/ForbiddenError";

/**
 * Thrown when route is guarded by @Authorized decorator.
 */
export class AccessDeniedError extends ForbiddenError {
    override name = "AccessDeniedError";

    constructor(method: string, url: string) {
        super();
        Object.setPrototypeOf(this, AccessDeniedError.prototype);
        const uri = `${method} ${url}`;
        this.message = `Access is denied for request on ${uri}`;
    }
}
