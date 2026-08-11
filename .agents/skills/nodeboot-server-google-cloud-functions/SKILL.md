---
name: nodeboot-server-google-cloud-functions
description: Use when the user wants to deploy a Node-Boot application to Google Cloud Functions gen2, and needs the HTTP function pattern built around `GoogleCloudFunctionsServer.getHandler()` plus `functions.http("api", ...)` from the sample entry point.
---

# Node-Boot on Google Cloud Functions

Use `@nodeboot/google-cloud-functions-server` when one Google Cloud Function should front the whole Node-Boot router.

## Fresh start or existing app?

Read [`../_shared/fresh-vs-existing.md`](../_shared/fresh-vs-existing.md) first, then apply it here:

-   **Fresh start:** `npx degit nodejs-boot/node-boot/samples/sample-google-cloud-functions my-app`.
-   **Existing app:** look for `functions.http("api", ...)` in `src/index.ts` and for `@nodeboot/google-cloud-functions-server` in `package.json` to confirm this adapter is (or isn't) already wired.

## Minimal function entry point

Grounded in [`samples/sample-google-cloud-functions/src/index.ts`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-google-cloud-functions/src/index.ts):

```ts
import * as functions from "@google-cloud/functions-framework";
import {GoogleCloudFunctionsHandler, GoogleCloudFunctionsServer} from "@nodeboot/google-cloud-functions-server";
import {GoogleCloudFunctionsSampleApp} from "./app";

let handler: GoogleCloudFunctionsHandler | null = null;

functions.http("api", async (req, res) => {
    if (!handler) {
        const app = await new GoogleCloudFunctionsSampleApp().start();
        const googleCloudFunctionsServer = app.server as GoogleCloudFunctionsServer;
        handler = googleCloudFunctionsServer.getHandler();
    }

    return handler(req, res);
});
```

## Notes that matter

-   Cache `GoogleCloudFunctionsServer.getHandler()` at module scope so warm invocations reuse the initialized app.
-   The exported function name is `api`; it must match both local emulation (`functions-framework --target=api`) and deployment (`--entry-point=api`).
-   The sample app in [`samples/sample-google-cloud-functions/src/app.ts`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-google-cloud-functions/src/app.ts) uses explicit imports instead of `@EnableComponentScan()` to keep behavior consistent with other serverless bundles.
-   Deploy as a gen2 HTTP function routing all requests into this one entry point.

## Source of truth

-   Package README: [`serverless/google-cloud-functions-server/README.md`](https://github.com/nodejs-boot/node-boot/blob/main/serverless/google-cloud-functions-server/README.md)
-   Sample app: [`samples/sample-google-cloud-functions/src/app.ts`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-google-cloud-functions/src/app.ts)
-   Sample handler: [`samples/sample-google-cloud-functions/src/index.ts`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-google-cloud-functions/src/index.ts)

## Validate

From [`samples/sample-google-cloud-functions/package.json`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-google-cloud-functions/package.json): run `cd samples/sample-google-cloud-functions && pnpm dev` to build and start the local Functions Framework on port `8080`.
