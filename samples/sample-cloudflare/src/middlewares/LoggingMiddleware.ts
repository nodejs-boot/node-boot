import {Logger} from "winston";
import {Middleware} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {Action, MiddlewareInterface} from "@nodeboot/context";
import {CloudflareContext, CloudflareRequest} from "@nodeboot/cloudflare-server";

@Middleware({type: "before"})
export class LoggingMiddleware implements MiddlewareInterface<CloudflareRequest, CloudflareContext> {
    @Inject("logger")
    private logger: Logger;

    async use(action: Action<CloudflareRequest, CloudflareContext>): Promise<void> {
        this.logger.info(`Incoming request: ${action.request.method} ${action.request.url.pathname}`);
    }
}
