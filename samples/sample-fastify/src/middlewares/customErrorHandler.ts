import { Logger } from "winston";
import { ErrorHandler } from "@node-boot/core";
import { Inject } from "@node-boot/di";
import { FastifyRequest } from "fastify/types/request";
import { FastifyReply } from "fastify/types/reply";
import { FastifyErrorHandlerInterface } from "@node-boot/core/src";
import { errorCodes, FastifyError } from "fastify";

@ErrorHandler()
export class CustomErrorHandler
  implements
    FastifyErrorHandlerInterface<FastifyRequest, FastifyReply, FastifyError>
{
  @Inject()
  private logger: Logger;

  error(
    request: FastifyRequest,
    reply: FastifyReply,
    error: FastifyError
  ): void {
    if (error instanceof errorCodes.FST_ERR_BAD_STATUS_CODE) {
      // Log error
      this.logger.error(error);
      // Send error response
      reply.status(500).send({ ok: false });
    } else {
      // fastify will use parent error handler to handle this
      reply.send(error);
    }
  }
}
