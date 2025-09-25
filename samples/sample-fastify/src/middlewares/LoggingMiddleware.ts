import {Logger} from "winston";
import {Middleware} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {FastifyReply, FastifyRequest, HookHandlerDoneFunction} from "fastify";
import {Action, MiddlewareInterface} from "@nodeboot/context";

@Middleware({type: "before"})
export class LoggingMiddleware implements MiddlewareInterface<FastifyRequest, FastifyReply, HookHandlerDoneFunction> {
    @Inject()
    private logger: Logger;

    async use(_: Action<FastifyRequest, FastifyReply, HookHandlerDoneFunction>): Promise<void> {
        this.logger.info(`Logging Middleware: Incoming request`);
    }
}
