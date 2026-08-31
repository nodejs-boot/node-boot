import {Middleware} from "@nodeboot/core";
import {Action, MiddlewareInterface} from "@nodeboot/context";
import {Request, Response} from "koa";

export const requestLog: string[] = [];

@Middleware({type: "before"})
export class RequestLogMiddleware implements MiddlewareInterface<Request, Response> {
    async use({request}: Action<Request, Response>): Promise<void> {
        requestLog.push(`${request.method} ${request.path}`);
    }
}
