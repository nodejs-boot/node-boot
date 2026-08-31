import {Middleware} from "@nodeboot/core";
import {Action, MiddlewareInterface} from "@nodeboot/context";
import {IncomingMessage, ServerResponse} from "node:http";

export const requestLog: string[] = [];

@Middleware({type: "before"})
export class RequestLogMiddleware implements MiddlewareInterface<IncomingMessage, ServerResponse> {
    async use({request}: Action<IncomingMessage, ServerResponse>): Promise<void> {
        requestLog.push(`${request.method} ${request.url?.split("?")[0]}`);
    }
}
