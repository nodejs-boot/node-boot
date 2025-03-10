import {Logger} from "winston";
import {Middleware} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {Action, MiddlewareInterface} from "@nodeboot/context";
import Application, {Request, Response} from "koa";

@Middleware({type: "before"})
export class LoggingMiddleware implements MiddlewareInterface<Request, Response> {
    @Inject()
    private logger: Logger;

    async use(_: Action<Application.Request, Response>): Promise<void> {
        this.logger.info(`Logging Middleware: Incoming request`);
    }
}
