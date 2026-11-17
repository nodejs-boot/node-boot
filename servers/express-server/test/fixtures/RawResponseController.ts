import {Controller, Get, Res} from "@nodeboot/core";
import type {ServerResponse} from "node:http";

/** Actions that own the response through `@Res()`: the driver must not send a second one. */
@Controller("/raw")
export class RawResponseController {
    /** Sends the response itself and returns nothing. */
    @Get("/send")
    async send(@Res() res: ServerResponse): Promise<void> {
        res.writeHead(202, {"content-type": "application/json"});
        res.end(JSON.stringify({sentBy: "handler"}));
    }

    /** Streams Server-Sent Events on the response. */
    @Get("/sse")
    async sse(@Res() res: ServerResponse): Promise<void> {
        res.writeHead(200, {"content-type": "text/event-stream"});
        for (const n of [1, 2, 3]) {
            res.write(`data: ${n}\n\n`);
            await new Promise(resolve => setTimeout(resolve, 5));
        }
        res.end();
    }
}
