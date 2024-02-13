import {Logger} from "winston";
import {Middleware} from "@node-boot/core";
import {Inject} from "@node-boot/di";
import {Action, MiddlewareInterface} from "@node-boot/context";
import {Request, Response} from "express";

@Middleware({type: "before"})
export class LoggingMiddleware implements MiddlewareInterface<Request, Response> {
    @Inject()
    private logger: Logger;

    async use(_: Action<Request, Response, Function>): Promise<void> {
        this.logger.info(`Logging Middleware: Incoming request`);
    }
}
