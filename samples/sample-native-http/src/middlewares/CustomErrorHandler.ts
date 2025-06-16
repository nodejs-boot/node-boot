import {Logger} from "winston";
import {ErrorHandler} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {Action, ErrorHandlerInterface} from "@nodeboot/context";
import {IncomingMessage, ServerResponse} from "node:http";
import {HttpError} from "@nodeboot/error/src";

@ErrorHandler()
export class CustomErrorHandler implements ErrorHandlerInterface<HttpError, IncomingMessage, ServerResponse> {
    @Inject()
    private logger: Logger;

    async onError(error: HttpError, action: Action<IncomingMessage, ServerResponse>): Promise<void> {
        const {request, response} = action;
        const status: number = error.httpCode || 500;
        const message: string = error.message || "Something went wrong";

        this.logger.error(`[${request.method}] >> StatusCode:: ${status}, Message:: ${message}`);
        response.statusCode = status;
        response.end(
            JSON.stringify({
                message: error.message,
                statusCode: error.httpCode,
            }),
        );
    }
}
