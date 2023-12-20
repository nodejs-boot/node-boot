import {Logger} from "winston";
import {Middleware} from "@node-boot/core";
import {Inject} from "@node-boot/di";
import {Action, MiddlewareInterface} from "@node-boot/context";
import {Request, Response} from "express";

@Middleware({type: "before"})
export class LoggingMiddleware implements MiddlewareInterface<Request, Response> {
    @Inject()
    private logger: Logger;

    use(action: Action<Request, Response, Function>): any {
        const {request, response, next} = action;
        this.logger.info(`Logging Middleware: Incoming request`);
        next?.();
    }
}
