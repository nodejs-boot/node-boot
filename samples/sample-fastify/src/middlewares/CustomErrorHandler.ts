import {Logger} from "winston";
import {ErrorHandler} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {errorCodes, FastifyError, FastifyReply, FastifyRequest} from "fastify";
import {Action, ErrorHandlerInterface} from "@nodeboot/context";

@ErrorHandler()
export class CustomErrorHandler implements ErrorHandlerInterface<FastifyError, FastifyRequest, FastifyReply> {
    @Inject()
    private logger: Logger;

    async onError(error: FastifyError, action: Action<FastifyRequest, FastifyReply>): Promise<void> {
        const {response} = action;
        if (error instanceof errorCodes.FST_ERR_BAD_STATUS_CODE) {
            // Log error
            this.logger.error(error);
            // Send error response
            response.status(500).send({ok: false});
        } else {
            // fastify will use parent error handler to handle this
            response.send(error);
        }
    }
}
