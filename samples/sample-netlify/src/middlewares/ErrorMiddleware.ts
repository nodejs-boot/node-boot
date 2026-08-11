import {Logger} from "winston";
import {ErrorHandler} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {Action, ErrorHandlerInterface} from "@nodeboot/context";
import {HandlerContext, HandlerEvent} from "@nodeboot/netlify-server";
import {HttpError} from "@nodeboot/error";

/**
 * Custom error handler for observability purposes (logging, alerting, metrics, etc.).
 *
 * NOTE: `NetlifyDriver` always builds and writes the final response itself using NodeBoot's
 * `GlobalErrorHandler`, so this handler is only invoked for its side effects and cannot override
 * the response body/status.
 */
@ErrorHandler()
export class ErrorMiddleware implements ErrorHandlerInterface<HttpError, HandlerEvent, HandlerContext> {
    @Inject()
    private logger: Logger;

    async onError(error: HttpError, action: Action<HandlerEvent, HandlerContext>): Promise<void> {
        const {request} = action;
        const status = error.httpCode || 500;

        this.logger.error(`[${request.httpMethod}] ${request.path} >> StatusCode:: ${status}`, error);
    }
}
