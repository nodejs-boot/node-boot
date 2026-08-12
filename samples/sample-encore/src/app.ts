import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableAuthorization} from "@nodeboot/authorization";
import {EnableValidations} from "@nodeboot/starter-validation";
import {EnableDI} from "@nodeboot/di";
import {EncoreServer} from "@nodeboot/encore-server";
import {LoggedInUserResolver} from "./auth/LoggedInUserResolver";
import {DefaultAuthorizationResolver} from "./auth/DefaultAuthorizationResolver";

// Beans are imported here for their side effects (decorator registration) instead of relying on
// `@EnableComponentScan`. Component scanning reads compiled files from `dist/` at runtime
// (`fs.readdirSync`), which doesn't match how Encore.ts bundles and runs the application.
// Explicit imports keep this sample's dependency graph statically discoverable, which also plays
// nicely with Encore.ts's own static analysis of the source tree.
import "./controllers/hello.controller";
import "./controllers/users.controller";
import "./services/users.service";
import "./middlewares/LoggingMiddleware";
import "./middlewares/ErrorMiddleware";
import {appConfig} from "./app-config";

/**
 * Node-Boot application entry point.
 *
 * Notice that, unlike the Express/Koa/Fastify samples, this application does not "listen" on a
 * port. Instead, `EncoreServer` boots Node-Boot's engine (controllers, DI, middleware,
 * authorization, validation) against an internal router and exposes a handler function that is
 * wired up as a single Encore.ts raw endpoint. See `api/index.ts`.
 */
@EnableDI(Container)
@EnableAuthorization(LoggedInUserResolver, DefaultAuthorizationResolver)
@EnableValidations()
@NodeBootApplication()
export class EncoreSampleApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(EncoreServer, appConfig);
    }
}
