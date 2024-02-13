import {Logger} from "winston";
import {Middleware} from "@node-boot/core";
import {Inject} from "@node-boot/di";
import {Action, MiddlewareInterface} from "@node-boot/context";
import Application, {Request, Response} from "koa";

@Middleware({type: "before"})
export class LoggingMiddleware implements MiddlewareInterface<Request, Response> {
    @Inject()
    private logger: Logger;

    async use(_: Action<Application.Request, Response>): Promise<void> {
        this.logger.info(`Logging Middleware: Incoming request`);
    }
}
