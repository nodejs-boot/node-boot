import "./polyfills";
import {CloudflareEnv, CloudflareHandler, CloudflareServer, ExecutionContext} from "@nodeboot/cloudflare-server";
import {CloudflareSampleApp} from "./app";

/**
 * Cloudflare Worker fetch handler entry point.
 *
 * Configure `wrangler.toml`'s `main` to point here (see this sample's `wrangler.toml`).
 * Wrangler bundles this file (and everything it imports) with esbuild for both
 * `wrangler dev` and `wrangler deploy`; no separate build step is required for deployment.
 */

// Reused across warm invocations of the same Worker isolate.
// Only re-initialized when Cloudflare spins up a brand-new isolate (cold start).
let fetchHandler: CloudflareHandler | null = null;

export default {
    async fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext): Promise<Response> {
        if (!fetchHandler) {
            const app = await new CloudflareSampleApp().start();
            const cloudflareServer = app.server as CloudflareServer;
            fetchHandler = cloudflareServer.getHandler();
        }

        return fetchHandler(request, env, ctx);
    },
};
