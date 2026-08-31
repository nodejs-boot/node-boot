import {ErrorHandler} from "@nodeboot/core";
import {Action, ErrorHandlerInterface} from "@nodeboot/context";
import {HttpError} from "@nodeboot/error";
import {IncomingMessage, ServerResponse} from "node:http";

@ErrorHandler()
export class TestErrorHandler implements ErrorHandlerInterface<HttpError, IncomingMessage, ServerResponse> {
    async onError(error: HttpError, action: Action<IncomingMessage, ServerResponse>): Promise<void> {
        const status = error.httpCode ?? 500;
        action.response.statusCode = status;
        action.response.setHeader("Content-Type", "application/json");
        action.response.end(
            JSON.stringify({
                fromCustomHandler: true,
                message: error.message,
                statusCode: status,
            }),
        );
    }
}
