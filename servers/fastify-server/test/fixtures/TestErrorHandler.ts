import {ErrorHandler} from "@nodeboot/core";
import {Action, ErrorHandlerInterface} from "@nodeboot/context";
import {HttpError} from "@nodeboot/error";
import {FastifyReply, FastifyRequest} from "fastify";

@ErrorHandler()
export class TestErrorHandler implements ErrorHandlerInterface<HttpError, FastifyRequest, FastifyReply> {
    async onError(error: HttpError, action: Action<FastifyRequest, FastifyReply>): Promise<void> {
        const status = error.httpCode ?? 500;
        action.response.code(status).send({
            fromCustomHandler: true,
            message: error.message,
            statusCode: status,
        });
    }
}
