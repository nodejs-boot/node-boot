---
name: nodeboot-server-netlify
description: Use when the user wants to deploy a Node-Boot application to Netlify Functions, and needs the catch-all `netlify/functions/api.ts` pattern built around `NetlifyServer.getHandler()` plus the `netlify.toml` rewrite that sends `/api/*` into the function.
---

# Node-Boot on Netlify Functions

Use `@nodeboot/netlify-server` when one Netlify Function should front the whole Node-Boot router.

## Fresh start or existing app?

Read [`../_shared/fresh-vs-existing.md`](../_shared/fresh-vs-existing.md) first, then apply it here:

-   **Fresh start:** `npx degit nodejs-boot/node-boot/samples/sample-netlify my-app`.
-   **Existing app:** look for `netlify/functions/api.ts`, `netlify.toml`, and `@nodeboot/netlify-server` in `package.json` to confirm this adapter is (or isn't) already wired.

## Minimal function entry point

Grounded in [`samples/sample-netlify/netlify/functions/api.ts`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-netlify/netlify/functions/api.ts):

```ts
import {HandlerContext, HandlerEvent, HandlerResponse, NetlifyHandler, NetlifyServer} from "@nodeboot/netlify-server";
import {NetlifySampleApp} from "../../src/app";

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
```

## Notes that matter

-   Cache `NetlifyServer.getHandler()` at module scope so warm invocations reuse the initialized app.
-   The sample app in [`samples/sample-netlify/src/app.ts`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-netlify/src/app.ts) uses explicit imports instead of `@EnableComponentScan()` because Netlify's esbuild bundle only reliably includes statically traced files.
-   The sample includes [`samples/sample-netlify/netlify.toml`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-netlify/netlify.toml); its redirect rewrites `/api/*` to `/.netlify/functions/api`, and `[build]` points Netlify at `netlify/functions` plus `pnpm run build`.
-   Keep Node-Boot's route prefix aligned with the rewrite (`/api` in the sample's `src/app-config.ts`).

## Source of truth

-   Package README: [`serverless/netlify-server/README.md`](https://github.com/nodejs-boot/node-boot/blob/main/serverless/netlify-server/README.md)
-   Sample app: [`samples/sample-netlify/src/app.ts`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-netlify/src/app.ts)
-   Sample handler: [`samples/sample-netlify/netlify/functions/api.ts`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-netlify/netlify/functions/api.ts)
-   Sample config: [`samples/sample-netlify/netlify.toml`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-netlify/netlify.toml)

## Validate

From [`samples/sample-netlify/package.json`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-netlify/package.json): run `cd samples/sample-netlify && pnpm dev` to start local emulation with `npx netlify-cli dev`.
