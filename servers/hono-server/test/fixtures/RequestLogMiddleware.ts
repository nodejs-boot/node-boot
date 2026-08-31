import {Middleware} from "@nodeboot/core";
import {Action, MiddlewareInterface} from "@nodeboot/context";
import {HonoRequest, HonoResponse} from "../../src";

/**
 * Global "before" middleware, registered ahead of every controller action.
 *
 * Exists to exercise the regression where a global middleware calling into the driver's
 * request-building logic could leak its own (param-less) match into the later, more specific
 * route handler. See `ItemsController.getById`.
 */
export const requestLog: string[] = [];

@Middleware({type: "before"})
export class RequestLogMiddleware implements MiddlewareInterface<HonoRequest, HonoResponse> {
    async use({request}: Action<HonoRequest, HonoResponse>): Promise<void> {
        requestLog.push(`${request.method} ${request.url.pathname}`);
    }
}
