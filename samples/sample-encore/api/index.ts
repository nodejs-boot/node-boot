import {api} from "encore.dev/api";
import {EncoreServer} from "@nodeboot/encore-server";
import {EncoreSampleApp} from "../src/app";

/**
 * Single catch-all Encore.ts raw endpoint. Every request Encore.ts receives - regardless of path
 * or HTTP method - is forwarded here (see the `/!path` fallback route syntax) and then dispatched
 * to Node-Boot's own router, which resolves the matching `@Controller`/`@Get`/`@Post`/... action.
 *
 * Reused across invocations of the same process; only re-initialized on cold start.
 */
let handler: ReturnType<EncoreServer["getHandler"]> | null = null;

export const apiHandler = api.raw({expose: true, method: "*", path: "/!path"}, async (req, resp) => {
    if (!handler) {
        const app = await new EncoreSampleApp().start();
        handler = (app.server as EncoreServer).getHandler();
    }
    return handler(req, resp);
});
