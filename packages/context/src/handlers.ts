import {Action} from "./types";
import {ActionMetadata} from "./metadata";

/**
 * Classes that intercepts response result must implement this interface.
 */
export interface InterceptorInterface<TRequest = any, TResponse = any, TNext = Function> {
    /**
     * Called before success response is being sent to the request.
     * Returned result will be sent to the user.
     */
    intercept(action: Action<TRequest, TResponse, TNext>, result: any): any | Promise<any>;
}

export interface MiddlewareInterface<TRequest = any, TResponse = any, TNext = Function> {
    use(action: Action<TRequest, TResponse, TNext>, payload?: unknown): any;
}

/**
 * n Node.js, uncaught errors are likely to cause memory leaks, file descriptor leaks, and other major production issues.
 * Domains were a failed attempt to fix this.
 *
 * Given that it is not possible to process all uncaught errors sensibly, the best way to deal with them is to crash.
 */
export interface ErrorHandlerInterface<
    TError extends Error = Error,
    TRequest = any,
    TResponse = any,
    TNext = Function,
> {
    onError(error: TError, action: Action<TRequest, TResponse, TNext>, metadata?: ActionMetadata): any;
}
