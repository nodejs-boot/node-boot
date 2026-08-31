import {ErrorHandler} from "@nodeboot/core";
import {Action, ErrorHandlerInterface} from "@nodeboot/context";
import {HttpError} from "@nodeboot/error";
import {Request, Response} from "koa";

@ErrorHandler()
export class TestErrorHandler implements ErrorHandlerInterface<HttpError, Request, Response> {
    async onError(error: HttpError, action: Action<Request, Response>): Promise<void> {
        const status = error.httpCode ?? 500;
        action.response.status = status;
        action.response.body = {
            fromCustomHandler: true,
            message: error.message,
            statusCode: status,
        };
    }
}
