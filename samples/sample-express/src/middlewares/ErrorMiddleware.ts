import {Logger} from "winston";
import {ErrorHandler} from "@node-boot/core";
import {Inject} from "@node-boot/di";
import {Action, ErrorHandlerInterface} from "@node-boot/context";
import {Request, Response} from "express";
import {HttpError} from "@node-boot/error";

@ErrorHandler()
export class ErrorMiddleware implements ErrorHandlerInterface<HttpError, Request, Response> {
    @Inject()
    private logger: Logger;

    async onError(error: HttpError, action: Action<Request, Response, Function>): Promise<void> {
        const {request, response} = action;
        const status: number = error.httpCode || 500;
        const message: string = error.message || "Something went wrong";

        this.logger.error(`[${request.method}] ${request.path} >> StatusCode:: ${status}, Message:: ${message}`);
        response.status(status).json({
            message: error.message,
            statusCode: error.httpCode,
        });
    }
}
