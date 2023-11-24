import {Logger} from "winston";
import {FastifyMiddlewareInterface, Middleware} from "@node-boot/core";
import {Inject} from "@node-boot/di";
import {FastifyReply, FastifyRequest} from "fastify";
import {HookHandlerDoneFunction} from "fastify/types/hooks";

@Middleware({type: "before"})
export class LoggingMiddleware
    implements
        FastifyMiddlewareInterface<
            FastifyRequest,
            FastifyReply,
            HookHandlerDoneFunction
        >
{
    @Inject()
    private logger: Logger;

    use(
        request: FastifyRequest,
        reply: FastifyReply,
        done: HookHandlerDoneFunction,
        payload?: any,
    ): void {
        this.logger.info(`Logging Middleware: Incoming request`);
        //done();
    }
}
