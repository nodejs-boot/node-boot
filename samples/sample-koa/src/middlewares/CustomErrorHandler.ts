import {Logger} from "winston";
import {ErrorHandler} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {Action, ErrorHandlerInterface} from "@nodeboot/context";
import {Request, Response} from "koa";
import {HttpError} from "@nodeboot/error";

@ErrorHandler()
export class CustomErrorHandler implements ErrorHandlerInterface<HttpError, Request, Response> {
    @Inject()
    private logger: Logger;

    async onError(error: HttpError, action: Action<Request, Response>): Promise<void> {
        const {request} = action;
        const status: number = error.httpCode || 500;
        const message: string = error.message || "Something went wrong";

        this.logger.error(`[${request.method}] ${request.path} >> StatusCode:: ${status}, Message:: ${message}`);
        action.context.set("Content-Type", "Application/json");
        action.context.status = status;
        action.context.body = {message};
    }
}
