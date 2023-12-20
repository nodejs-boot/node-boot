import {Logger} from "winston";
import {Middleware} from "@node-boot/core";
import {Inject} from "@node-boot/di";
import {Action, MiddlewareInterface} from "@node-boot/context";
import Application, {Request, Response} from "koa";

@Middleware({type: "before"})
export class LoggingMiddleware implements MiddlewareInterface<Request, Response> {
    @Inject()
    private logger: Logger;

    async use(action: Action<Application.Request, Response>, payload?: unknown): Promise<any> {
        this.logger.info(`Logging Middleware: Incoming request`);
        action.context;
        return action
            .next?.()
            .then(() => {
                console.log("do something after execution");
            })
            .catch(error => {
                console.log("error handling is also here");
            });
    }
}
