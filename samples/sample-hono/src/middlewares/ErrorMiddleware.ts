import {Logger} from "winston";
import {ErrorHandler} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {Action, ErrorHandlerInterface} from "@nodeboot/context";
import {HonoRequest, HonoResponse} from "@nodeboot/hono-server";
import {HttpError} from "@nodeboot/error";

@ErrorHandler()
export class ErrorMiddleware implements ErrorHandlerInterface<HttpError, HonoRequest, HonoResponse> {
    @Inject()
    private logger: Logger;

    async onError(error: HttpError, action: Action<HonoRequest, HonoResponse, Function>): Promise<void> {
        const {request, response} = action;
        const status: number = error.httpCode || 500;
        const message: string = error.message || "Something went wrong";

        this.logger.error(
            `[${request.method}] ${request.url.pathname} >> StatusCode:: ${status}, Message:: ${message}`,
        );
        // `c.json()` only builds a Response - it must be assigned back to `response.res` to actually apply it.
        response.res = response.json(
            {
                message: error.message,
                statusCode: error.httpCode,
            },
            status as any,
        );
    }
}
