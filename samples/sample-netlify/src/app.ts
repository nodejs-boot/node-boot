import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableAuthorization} from "@nodeboot/authorization";
import {EnableValidations} from "@nodeboot/starter-validation";
import {EnableDI} from "@nodeboot/di";
import {NetlifyServer} from "@nodeboot/netlify-server";
import {LoggedInUserResolver} from "./auth/LoggedInUserResolver";
import {DefaultAuthorizationResolver} from "./auth/DefaultAuthorizationResolver";

// Beans are imported here for their side effects (decorator registration) instead of relying on
// `@EnableComponentScan`. Component scanning reads compiled files from `dist/` at runtime
// (`fs.readdirSync`), but Netlify Functions only ship the subset of files statically traced from
// the function's entry point (via esbuild) - untraced directories scanned dynamically at runtime
// are not guaranteed to be present in the deployed bundle. Explicit imports here make the whole
// dependency graph statically discoverable, so it works reliably both locally and once deployed.
import "./controllers/hello.controller";
import "./controllers/users.controller";
import "./services/users.service";
import "./middlewares/LoggingMiddleware";
import "./middlewares/ErrorMiddleware";
import {appConfig} from "./app-config";

/**
 * NodeBoot application entry point.
 *
 * Notice that, unlike the Express/Koa/Fastify samples, this application does not "listen" on a
 * port. Instead, it is bootstrapped once per Netlify Function instance (cold start) and its
 * `NetlifyServer` exposes a handler function that Netlify invokes for every incoming request.
 * See `netlify/functions/api.ts`.
 */
@EnableDI(Container)
@EnableAuthorization(LoggedInUserResolver, DefaultAuthorizationResolver)
@EnableValidations()
@NodeBootApplication()
export class NetlifySampleApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(NetlifyServer, appConfig);
    }
}
