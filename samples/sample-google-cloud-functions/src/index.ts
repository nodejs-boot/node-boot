import * as functions from "@google-cloud/functions-framework";
import {GoogleCloudFunctionsHandler, GoogleCloudFunctionsServer} from "@nodeboot/google-cloud-functions-server";
import {GoogleCloudFunctionsSampleApp} from "./app";

/**
 * Google Cloud Functions (2nd gen) HTTP function entry point.
 *
 * `functions.http("api", ...)` registers this handler with the functions-framework registry.
 * The name passed here (`api`) must match the `--entry-point` flag used both locally
 * (`pnpm run dev`) and when deploying (`pnpm run deploy`, see `package.json`). A single Cloud
 * Function handles every route processed by NodeBoot's internal router, since NodeBoot's
 * `routePrefix` is configured as `/api` (see `src/app-config.ts`).
 */

// Reused across warm invocations of the same Cloud Function instance.
// Only re-initialized when Google Cloud spins up a brand-new instance (cold start).
let handler: GoogleCloudFunctionsHandler | null = null;

functions.http("api", async (req, res) => {
    if (!handler) {
        const app = await new GoogleCloudFunctionsSampleApp().start();
        const googleCloudFunctionsServer = app.server as GoogleCloudFunctionsServer;
        handler = googleCloudFunctionsServer.getHandler();
    }

    return handler(req, res);
});
