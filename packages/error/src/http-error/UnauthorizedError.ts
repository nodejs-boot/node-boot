import {HttpError} from "./HttpError";

/**
 * Exception for 401 HTTP error.
 */
export class UnauthorizedError extends HttpError {
    override name = "UnauthorizedError";

    constructor(message?: string) {
        super(401);

        if (message) this.message = message;
    }
}
