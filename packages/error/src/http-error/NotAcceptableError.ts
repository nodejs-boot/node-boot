import {HttpError} from "./HttpError";

/**
 * Exception for 406 HTTP error.
 */
export class NotAcceptableError extends HttpError {
    override name = "NotAcceptableError";

    constructor(message?: string) {
        super(406);
        Object.setPrototypeOf(this, NotAcceptableError.prototype);

        if (message) this.message = message;
    }
}
