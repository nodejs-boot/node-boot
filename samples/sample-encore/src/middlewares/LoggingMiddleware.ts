import {Logger} from "winston";
import {Middleware} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {Action, MiddlewareInterface} from "@nodeboot/context";
import {IncomingMessage, ServerResponse} from "node:http";

@Middleware({type: "before"})
export class LoggingMiddleware implements MiddlewareInterface<IncomingMessage, ServerResponse> {
    // Encore.ts bundles with esbuild, which doesn't emit `design:type` metadata for
    // `emitDecoratorMetadata`, so property injection must use an explicit token instead of
    // relying on reflected type information.
    @Inject("logger")
    private logger: Logger;

    async use(action: Action<IncomingMessage, ServerResponse>): Promise<void> {
        this.logger.info(`Incoming request: ${action.request.method} ${action.request.url}`);
    }
}
