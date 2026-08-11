---
name: nodeboot-server-cloudflare
description: Use when the user wants to deploy a Node-Boot application to Cloudflare Workers, needs the Fetch API adapter from `CloudflareServer.getHandler()`, and must follow the Workers-specific sample pattern with `wrangler.toml`, explicit imports instead of `@EnableComponentScan()`, and config passed in directly.
---

# Node-Boot on Cloudflare Workers

Use `@nodeboot/cloudflare-server` when the app should run inside a Cloudflare Worker isolate rather than a Node.js HTTP server.

## Fresh start or existing app?

Read [`../_shared/fresh-vs-existing.md`](../_shared/fresh-vs-existing.md) first, then apply it here:

-   **Fresh start:** `npx degit nodejs-boot/node-boot/samples/sample-cloudflare my-app`.
-   **Existing app:** look for `src/worker.ts` exporting a `fetch` handler, `wrangler.toml`, and `@nodeboot/cloudflare-server` in `package.json` to confirm this adapter is (or isn't) already wired.

## Minimal Worker entry point

Grounded in [`samples/sample-cloudflare/src/worker.ts`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-cloudflare/src/worker.ts):

```ts
import "./polyfills";
import {CloudflareEnv, CloudflareHandler, CloudflareServer, ExecutionContext} from "@nodeboot/cloudflare-server";
import {CloudflareSampleApp} from "./app";

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
```

## Notes that matter

-   Build the app once outside the per-request path by caching `CloudflareServer.getHandler()` in module scope; Cloudflare reuses it on warm isolate invocations.
-   The sample app uses `NodeBoot.run(CloudflareServer, appConfig)` in [`samples/sample-cloudflare/src/app.ts`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-cloudflare/src/app.ts) because Workers cannot rely on filesystem-based config discovery.
-   Do **not** use `@EnableComponentScan()` here. The sample explicitly imports controllers/services/middleware for decorator side effects because Workers have no filesystem or dynamic `require`.
-   `wrangler.toml` is required in the sample: `main = "src/worker.ts"`, `compatibility_flags = ["nodejs_compat"]`, plus a `glob` alias stub so Wrangler/esbuild can bundle the Worker.

## Source of truth

-   Package README: [`serverless/cloudflare-server/README.md`](https://github.com/nodejs-boot/node-boot/blob/main/serverless/cloudflare-server/README.md)
-   Sample app: [`samples/sample-cloudflare/src/app.ts`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-cloudflare/src/app.ts)
-   Sample Worker: [`samples/sample-cloudflare/src/worker.ts`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-cloudflare/src/worker.ts)
-   Sample config: [`samples/sample-cloudflare/wrangler.toml`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-cloudflare/wrangler.toml)

## Validate

From [`samples/sample-cloudflare/package.json`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-cloudflare/package.json): run `cd samples/sample-cloudflare && pnpm dev` to start local emulation with `wrangler dev`.
