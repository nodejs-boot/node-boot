import {Controller, Get, Res} from "@nodeboot/core";
import type {Context} from "hono";

/** Actions that own the response through `@Res()`: the driver must not replace their answer. */
@Controller("/raw")
export class RawResponseController {
    /** Sets the response itself and returns nothing. */
    @Get("/send")
    async send(@Res() c: Context): Promise<void> {
        c.res = c.json({sentBy: "handler"}, 202);
    }

    /** Streams Server-Sent Events as the response body. */
    @Get("/sse")
    async sse(@Res() c: Context): Promise<void> {
        const encoder = new TextEncoder();
        const body = new ReadableStream({
            async start(controller) {
                for (const n of [1, 2, 3]) {
                    controller.enqueue(encoder.encode(`data: ${n}\n\n`));
                    await new Promise(resolve => setTimeout(resolve, 5));
                }
                controller.close();
            },
        });
        c.res = new Response(body, {status: 200, headers: {"content-type": "text/event-stream"}});
    }
}
