import {Logger} from "winston";
import {Middleware} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {Action, MiddlewareInterface} from "@nodeboot/context";
import {HandlerContext, HandlerEvent} from "@nodeboot/netlify-server";

@Middleware({type: "before"})
export class LoggingMiddleware implements MiddlewareInterface<HandlerEvent, HandlerContext> {
    @Inject()
    private logger: Logger;

    async use(action: Action<HandlerEvent, HandlerContext>): Promise<void> {
        this.logger.info(`Incoming request: ${action.request.httpMethod} ${action.request.path}`);
    }
}
