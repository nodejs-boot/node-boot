import {Logger} from "winston";
import {ErrorHandler} from "@node-boot/core";
import {Inject} from "@node-boot/di";
import {Action, ErrorHandlerInterface} from "@node-boot/context";
import {Request, Response} from "koa";
import {HttpError} from "@node-boot/error";

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
