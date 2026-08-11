import {Logger} from "winston";
import {ErrorHandler} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {Action, ErrorHandlerInterface} from "@nodeboot/context";
import {GoogleCloudFunctionsRequest, GoogleCloudFunctionsResponse} from "@nodeboot/google-cloud-functions-server";
import {HttpError} from "@nodeboot/error";

/**
 * Custom error handler for observability purposes (logging, alerting, metrics, etc.).
 *
 * NOTE: `GoogleCloudFunctionsDriver` always builds and writes the final response itself using NodeBoot's
 * `GlobalErrorHandler`, so this handler is only invoked for its side effects and cannot override
 * the response body/status.
 */
@ErrorHandler()
export class ErrorMiddleware
    implements ErrorHandlerInterface<HttpError, GoogleCloudFunctionsRequest, GoogleCloudFunctionsResponse>
{
    @Inject()
    private logger: Logger;

    async onError(
        error: HttpError,
        action: Action<GoogleCloudFunctionsRequest, GoogleCloudFunctionsResponse>,
    ): Promise<void> {
        const {request} = action;
        const status = error.httpCode || 500;

        this.logger.error(`[${request.method}] ${request.path} >> StatusCode:: ${status}`, error);
    }
}
