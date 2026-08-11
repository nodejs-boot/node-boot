import {Logger} from "winston";
import {ErrorHandler} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {Action, ErrorHandlerInterface} from "@nodeboot/context";
import {APIGatewayProxyEvent, Context} from "aws-lambda";
import {HttpError} from "@nodeboot/error";

/**
 * Custom error handler for observability purposes (logging, alerting, metrics, etc.).
 *
 * NOTE: Unlike Express/Koa/Fastify, in Lambda there is no mutable `response` object to
 * write the error body to (`action.response` is the AWS Lambda `Context`, not an HTTP
 * response). Because of that, `LambdaDriver` always builds the final `APIGatewayProxyResult`
 * itself using NodeBoot's `GlobalErrorHandler`; this handler is only invoked for its
 * side effects and cannot override the response body/status.
 */
@ErrorHandler()
export class ErrorMiddleware implements ErrorHandlerInterface<HttpError, APIGatewayProxyEvent, Context> {
    @Inject()
    private logger: Logger;

    async onError(error: HttpError, action: Action<APIGatewayProxyEvent, Context>): Promise<void> {
        const {request} = action;
        const status = error.httpCode || 500;

        this.logger.error(`[${request.httpMethod}] ${request.path} >> StatusCode:: ${status}`, error);
    }
}
