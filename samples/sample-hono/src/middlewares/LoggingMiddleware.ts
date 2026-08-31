import {Logger} from "winston";
import {Middleware} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {Action, MiddlewareInterface} from "@nodeboot/context";
import {HonoRequest, HonoResponse} from "@nodeboot/hono-server";

@Middleware({type: "before"})
export class LoggingMiddleware implements MiddlewareInterface<HonoRequest, HonoResponse> {
    @Inject()
    private logger: Logger;

    async use(_: Action<HonoRequest, HonoResponse, Function>): Promise<void> {
        this.logger.info(`Logging Middleware: Incoming request`);
    }
}
