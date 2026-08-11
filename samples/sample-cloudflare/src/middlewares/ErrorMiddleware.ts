import {Logger} from "winston";
import {ErrorHandler} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {Action, ErrorHandlerInterface} from "@nodeboot/context";
import {CloudflareContext, CloudflareRequest} from "@nodeboot/cloudflare-server";
import {HttpError} from "@nodeboot/error";

/**
 * Custom error handler for observability purposes (logging, alerting, metrics, etc.).
 *
 * NOTE: Just like Lambda, there is no mutable `response` object to write the error body
 * to on Cloudflare Workers (`action.response` is the Worker's `CloudflareContext`, not an
 * HTTP response). Because of that, `CloudflareDriver` always builds the final `Response`
 * itself using NodeBoot's `GlobalErrorHandler`; this handler is only invoked for its
 * side effects and cannot override the response body/status.
 */
@ErrorHandler()
export class ErrorMiddleware implements ErrorHandlerInterface<HttpError, CloudflareRequest, CloudflareContext> {
    @Inject("logger")
    private logger: Logger;

    async onError(error: HttpError, action: Action<CloudflareRequest, CloudflareContext>): Promise<void> {
        const {request} = action;
        const status = error.httpCode || 500;

        this.logger.error(`[${request.method}] ${request.url.pathname} >> StatusCode:: ${status}`, error);
    }
}
