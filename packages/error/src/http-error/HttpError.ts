/**
 * Used to throw HTTP errors.
 * Just do throw new HttpError(code, message) in your controller action and
 * default error handler will catch it and give in your response given code and message .
 */
export class HttpError extends Error {
    httpCode: number;

    constructor(httpCode: number, message?: string) {
        super();
        // Use new.target rather than HttpError.prototype so `instanceof` resolves correctly for
        // every subclass in the chain (including subclasses of subclasses), without each of them
        // having to redundantly reset the prototype themselves.
        Object.setPrototypeOf(this, new.target.prototype);

        if (httpCode) this.httpCode = httpCode;
        if (message) this.message = message;
    }
}
