import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableAuthorization} from "@nodeboot/authorization";
import {EnableValidations} from "@nodeboot/starter-validation";
import {EnableDI} from "@nodeboot/di";
import {GoogleCloudFunctionsServer} from "@nodeboot/google-cloud-functions-server";
import {LoggedInUserResolver} from "./auth/LoggedInUserResolver";
import {DefaultAuthorizationResolver} from "./auth/DefaultAuthorizationResolver";

// Beans are imported here for their side effects (decorator registration) instead of relying on
// `@EnableComponentScan`. Component scanning reads compiled files from `dist/` at runtime
// (`fs.readdirSync`), and while Cloud Functions does ship the whole deployed source (unlike
// Vercel/Netlify's traced bundles), explicit imports keep this sample's dependency graph
// statically discoverable and its behavior identical across every serverless target.
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
 * port. Instead, it is bootstrapped once per Cloud Function instance (cold start) and its
 * `GoogleCloudFunctionsServer` exposes a handler function that the functions-framework invokes for every incoming
 * request. See `src/index.ts`.
 */
@EnableDI(Container)
@EnableAuthorization(LoggedInUserResolver, DefaultAuthorizationResolver)
@EnableValidations()
@NodeBootApplication()
export class GoogleCloudFunctionsSampleApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(GoogleCloudFunctionsServer, appConfig);
    }
}
