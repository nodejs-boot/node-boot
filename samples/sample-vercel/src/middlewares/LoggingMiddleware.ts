import {Logger} from "winston";
import {Middleware} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {Action, MiddlewareInterface} from "@nodeboot/context";
import {VercelRequest, VercelResponse} from "@nodeboot/vercel-server";

@Middleware({type: "before"})
export class LoggingMiddleware implements MiddlewareInterface<VercelRequest, VercelResponse> {
    @Inject()
    private logger: Logger;

    async use(action: Action<VercelRequest, VercelResponse>): Promise<void> {
        this.logger.info(`Incoming request: ${action.request.method} ${action.request.url}`);
    }
}
