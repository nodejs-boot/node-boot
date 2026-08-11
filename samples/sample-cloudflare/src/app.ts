import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableAuthorization} from "@nodeboot/authorization";
import {EnableValidations} from "@nodeboot/starter-validation";
import {EnableDI} from "@nodeboot/di";
import {CloudflareServer} from "@nodeboot/cloudflare-server";
import {LoggedInUserResolver} from "./auth/LoggedInUserResolver";
import {DefaultAuthorizationResolver} from "./auth/DefaultAuthorizationResolver";

// Beans are imported here for their side effects (decorator registration) instead of
// relying on `@EnableComponentScan`. Cloudflare Workers run in a V8 isolate with no
// filesystem or dynamic `require`, so Node-Boot's directory-scanning AOT mechanism
// (which reads compiled files from `dist/`) cannot run in that environment. Since
// Wrangler bundles the whole dependency graph with esbuild anyway, explicitly
// importing every controller/service/middleware here is both simpler and correct.
import "./controllers/hello.controller";
import "./controllers/users.controller";
import "./services/users.service";
import "./middlewares/LoggingMiddleware";
import "./middlewares/ErrorMiddleware";
import {appConfig} from "./app-config";

/**
 * NodeBoot application entry point.
 *
 * Notice that, unlike the Express/Koa/Fastify samples, this application does not
 * "listen" on a port. Instead, it is bootstrapped once per Worker isolate (cold start)
 * and its `CloudflareServer` exposes a `fetch` handler function that the Cloudflare
 * runtime invokes for every incoming request. See `src/worker.ts`.
 */
@EnableDI(Container)
@EnableAuthorization(LoggedInUserResolver, DefaultAuthorizationResolver)
@EnableValidations()
@NodeBootApplication()
export class CloudflareSampleApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(CloudflareServer, appConfig);
    }
}
