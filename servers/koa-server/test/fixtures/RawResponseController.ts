import {Controller, Get, Res} from "@nodeboot/core";
import type {Response} from "koa";

/** Actions that own the response through `@Res()`: the driver must not replace their answer. */
@Controller("/raw")
export class RawResponseController {
    /** Sets the response itself and returns nothing. */
    @Get("/send")
    async send(@Res() response: Response): Promise<void> {
        response.status = 202;
        response.body = {sentBy: "handler"};
    }

    /** Streams Server-Sent Events on the raw response (Koa's own response handling is turned off). */
    @Get("/sse")
    async sse(@Res() response: Response): Promise<void> {
        response.ctx.respond = false;
        const res = response.ctx.res;
        res.writeHead(200, {"content-type": "text/event-stream"});
        for (const n of [1, 2, 3]) {
            res.write(`data: ${n}\n\n`);
            await new Promise(resolve => setTimeout(resolve, 5));
        }
        res.end();
    }
}
