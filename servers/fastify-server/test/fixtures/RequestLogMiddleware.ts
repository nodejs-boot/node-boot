import {Middleware} from "@nodeboot/core";
import {Action, MiddlewareInterface} from "@nodeboot/context";
import {FastifyReply, FastifyRequest} from "fastify";

export const requestLog: string[] = [];

@Middleware({type: "before"})
export class RequestLogMiddleware implements MiddlewareInterface<FastifyRequest, FastifyReply> {
    async use({request}: Action<FastifyRequest, FastifyReply>): Promise<void> {
        requestLog.push(`${request.method} ${request.url.split("?")[0]}`);
    }
}
