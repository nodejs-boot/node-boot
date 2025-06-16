import {Logger} from "winston";
import {Middleware} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {Action, MiddlewareInterface} from "@nodeboot/context";
import {IncomingMessage, ServerResponse} from "node:http";

@Middleware({type: "before"})
export class LoggingMiddleware implements MiddlewareInterface<IncomingMessage, ServerResponse> {
    @Inject()
    private logger: Logger;

    async use(_: Action<IncomingMessage, ServerResponse>): Promise<void> {
        this.logger.info(`Logging Middleware: Incoming request`);
    }
}
