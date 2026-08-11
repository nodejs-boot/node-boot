---
name: nodeboot-server-vercel
description: Use when the user wants to deploy a Node-Boot application to Vercel as a Node.js Serverless Function, and needs the catch-all `api/[...path].ts` pattern built around `VercelServer.getHandler()` with explicit imports so the deployment bundle statically includes every decorated class.
---

# Node-Boot on Vercel

Use `@nodeboot/vercel-server` when one Vercel Node.js Serverless Function should front the whole Node-Boot router.

## Fresh start or existing app?

Read [`../_shared/fresh-vs-existing.md`](../_shared/fresh-vs-existing.md) first, then apply it here:

-   **Fresh start:** `npx degit nodejs-boot/node-boot/samples/sample-vercel my-app`.
-   **Existing app:** look for `api/[...path].ts` and `@nodeboot/vercel-server` in `package.json` to confirm this adapter is (or isn't) already wired.

## Minimal function entry point

Grounded in [`samples/sample-vercel/api/[...path].ts`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-vercel/api/[...path].ts):

```ts
import type {VercelRequest, VercelResponse} from "@nodeboot/vercel-server";
import {VercelHandler, VercelServer} from "@nodeboot/vercel-server";
import {VercelSampleApp} from "../src/app";

let vercelHandler: VercelHandler | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    if (!vercelHandler) {
        const app = await new VercelSampleApp().start();
        const vercelServer = app.server as VercelServer;
        vercelHandler = vercelServer.getHandler();
    }

    return vercelHandler(req, res);
}
```

## Notes that matter

-   Cache `VercelServer.getHandler()` at module scope so cold start happens once per Function instance, not on every request.
-   The sample uses a catch-all file name, `api/[...path].ts`, so one function handles every route under `/api/*`.
-   The sample app in [`samples/sample-vercel/src/app.ts`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-vercel/src/app.ts) avoids `@EnableComponentScan()` and imports controllers/services/middleware explicitly; Vercel's traced bundle only includes statically discoverable files.
-   No `vercel.json` is needed in the sample because Node-Boot's `routePrefix` is already `/api`, matching Vercel's file-system routing.

## Source of truth

-   Package README: [`serverless/vercel-server/README.md`](https://github.com/nodejs-boot/node-boot/blob/main/serverless/vercel-server/README.md)
-   Sample app: [`samples/sample-vercel/src/app.ts`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-vercel/src/app.ts)
-   Sample handler: [`samples/sample-vercel/api/[...path].ts`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-vercel/api/[...path].ts)

## Validate

From [`samples/sample-vercel/package.json`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-vercel/package.json): run `cd samples/sample-vercel && pnpm dev` to start local emulation with `vercel dev`.
