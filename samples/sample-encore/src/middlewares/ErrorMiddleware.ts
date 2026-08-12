import {Logger} from "winston";
import {ErrorHandler} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {Action, ErrorHandlerInterface} from "@nodeboot/context";
import {HttpError} from "@nodeboot/error";
import {IncomingMessage, ServerResponse} from "node:http";

/**
 * Custom error handler for observability purposes (logging, alerting, metrics, etc.).
 *
 * NOTE: `EncoreDriver` always builds and writes the final response itself using Node-Boot's
 * `GlobalErrorHandler`, so this handler is only invoked for its side effects and cannot override
 * the response body/status.
 */
@ErrorHandler()
export class ErrorMiddleware implements ErrorHandlerInterface<HttpError, IncomingMessage, ServerResponse> {
    // Encore.ts bundles with esbuild, which doesn't emit `design:type` metadata for
    // `emitDecoratorMetadata`, so property injection must use an explicit token instead of
    // relying on reflected type information.
    @Inject("logger")
    private logger: Logger;

    async onError(error: HttpError, action: Action<IncomingMessage, ServerResponse>): Promise<void> {
        const {request} = action;
        const status = error.httpCode || 500;

        this.logger.error(`[${request.method}] ${request.url} >> StatusCode:: ${status}`, error);
    }
}
