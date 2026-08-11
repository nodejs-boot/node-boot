import type {VercelRequest, VercelResponse} from "@nodeboot/vercel-server";
import {VercelHandler, VercelServer} from "@nodeboot/vercel-server";
import {VercelSampleApp} from "../src/app";

/**
 * Vercel Node.js Serverless Function entry point.
 *
 * This file's name (`[...path].ts`) makes it a catch-all route matching every request under
 * `/api/*`, so a single Serverless Function is able to handle every path processed by NodeBoot's
 * internal router. Since NodeBoot's `routePrefix` is configured as `/api` (see `src/app-config.ts`),
 * this lines up with Vercel's file-system routing without needing any custom rewrites in
 * `vercel.json`.
 */

// Reused across warm invocations of the same Serverless Function instance.
// Only re-initialized when Vercel spins up a brand-new instance (cold start).
let vercelHandler: VercelHandler | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    if (!vercelHandler) {
        const app = await new VercelSampleApp().start();
        const vercelServer = app.server as VercelServer;
        vercelHandler = vercelServer.getHandler();
    }

    return vercelHandler(req, res);
}
