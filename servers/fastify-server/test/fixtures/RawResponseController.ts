import {Controller, Get, Res} from "@nodeboot/core";
import type {FastifyReply} from "fastify";

/** Actions that own the response through `@Res()`: the driver must not send a second one. */
@Controller("/raw")
export class RawResponseController {
    /** Sends the reply itself and returns nothing. */
    @Get("/send")
    async send(@Res() reply: FastifyReply): Promise<void> {
        reply.code(202).send({sentBy: "handler"});
    }

    /** Streams Server-Sent Events on the raw response (the reply is hijacked). */
    @Get("/sse")
    async sse(@Res() reply: FastifyReply): Promise<void> {
        reply.hijack();
        reply.raw.writeHead(200, {"content-type": "text/event-stream"});
        for (const n of [1, 2, 3]) {
            reply.raw.write(`data: ${n}\n\n`);
            await new Promise(resolve => setTimeout(resolve, 5));
        }
        reply.raw.end();
    }
}
