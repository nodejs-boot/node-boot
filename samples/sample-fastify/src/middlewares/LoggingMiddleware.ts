import {Logger} from "winston";
import {Middleware} from "@node-boot/core";
import {Inject} from "@node-boot/di";
import {FastifyReply, FastifyRequest} from "fastify";
import {HookHandlerDoneFunction} from "fastify/types/hooks";
import {Action, MiddlewareInterface} from "@node-boot/context";

@Middleware({type: "before"})
export class LoggingMiddleware implements MiddlewareInterface<FastifyRequest, FastifyReply, HookHandlerDoneFunction> {
    @Inject()
    private logger: Logger;

    use(action: Action<FastifyRequest, FastifyReply, HookHandlerDoneFunction>, payload?: any): void {
        this.logger.info(`Logging Middleware: Incoming request`);
        //done();
    }
}
