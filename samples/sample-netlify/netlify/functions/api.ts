import {HandlerContext, HandlerEvent, HandlerResponse, NetlifyHandler, NetlifyServer} from "@nodeboot/netlify-server";
import {NetlifySampleApp} from "../../src/app";

/**
 * Netlify Function entry point.
 *
 * This is a single catch-all function, so it handles every path processed by NodeBoot's internal
 * router. Since NodeBoot's `routePrefix` is configured as `/api` (see `src/app-config.ts`),
 * requests to `/api/*` are rewritten to this function via the redirect rule in `netlify.toml`.
 */

// Reused across warm invocations of the same Function instance.
// Only re-initialized when Netlify spins up a brand-new instance (cold start).
let netlifyHandler: NetlifyHandler | null = null;

export const handler: NetlifyHandler = async (
    event: HandlerEvent,
    context: HandlerContext,
): Promise<HandlerResponse> => {
    if (!netlifyHandler) {
        const app = await new NetlifySampleApp().start();
        const netlifyServer = app.server as NetlifyServer;
        netlifyHandler = netlifyServer.getHandler();
    }

    return netlifyHandler(event, context) as Promise<HandlerResponse>;
};
