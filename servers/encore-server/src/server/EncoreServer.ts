import {ApplicationContext, JsonObject} from "@nodeboot/context";
import {BaseServer, NodeBootAppView} from "@nodeboot/core";
import {NodeBootToolkit} from "@nodeboot/engine";
import Router, {HTTPVersion, Instance} from "find-my-way";
import {EncoreDriver} from "../driver";
import {EncoreRawHandler, EncoreServerConfigs} from "../types";

/**
 * Encore.ts integration for Node-Boot.
 *
 * Unlike the Express/Koa/Fastify/native-http servers, this server does not own an HTTP listening
 * socket - Encore.ts's own runtime does that. Instead, `EncoreServer` boots the whole Node-Boot
 * application (controllers, middlewares, DI, OpenAPI, actuator, etc.) against an internal
 * `find-my-way` router and exposes a single `getHandler()` method. That handler has the exact
 * signature Encore.ts expects from a raw endpoint (`(req, resp) => Promise<void>`), so it can be
 * wired up as a catch-all `api.raw` endpoint that forwards every request into Node-Boot's router.
 *
 * @example
 * ```ts
 * // api.ts
 * import { api } from "encore.dev/api";
 * import { EncoreServer } from "@nodeboot/encore-server";
 * import { MyApp } from "./app";
 *
 * let handler: ReturnType<EncoreServer["getHandler"]> | null = null;
 *
 * export const apiHandler = api.raw(
 *     {expose: true, method: "*", path: "/!path"},
 *     async (req, resp) => {
 *         if (!handler) {
 *             const app = await new MyApp().start();
 *             handler = (app.server as EncoreServer).getHandler();
 *         }
 *         return handler(req, resp);
 *     },
 * );
 * ```
 */
export class EncoreServer extends BaseServer<void, Instance<HTTPVersion.V1>> {
    // Controller actions are registered with a trailing slash for their index route (e.g.
    // `@Controller("/hello")` + `@Get("/")` builds the route "/hello/"), but incoming request
    // URLs typically omit it (e.g. `/hello`). `ignoreTrailingSlash` makes find-my-way treat
    // both forms as equivalent so routes match regardless of how the client requests them.
    private readonly router = Router({ignoreTrailingSlash: true});
    private driver: EncoreDriver | null = null;

    constructor() {
        super("encore");
    }

    async run(additionalConfig?: JsonObject): Promise<EncoreServer> {
        const context = ApplicationContext.get();
        await super.configure(undefined, this.router, additionalConfig);

        if (context.applicationAdapter) {
            const engineOptions = context.applicationAdapter.bind(context.diOptions?.iocContainer);

            const serverConfigs = this.getServerConfigurations<EncoreServerConfigs>();
            if (!serverConfigs) {
                this.logger.warn(
                    `No Server configurations provided for Encore Server. To enable server configurations for CORS and Cookies, consider creating a @Bean(SERVER_CONFIGURATIONS) that returns an "EncoreServerConfigs" object`,
                );
            }

            this.driver = new EncoreDriver({
                logger: this.logger,
                router: this.router,
                serverConfigs,
            });

            NodeBootToolkit.createServer(this.driver, engineOptions);
        } else {
            throw new Error(
                "Error starting Application. Please enable NodeBoot application using @NodeBootApplication",
            );
        }
        return this;
    }

    /**
     * Returns the handler function to be registered as an Encore.ts raw endpoint, e.g.
     * `api.raw({expose: true, method: "*", path: "/!path"}, server.getHandler())` from your
     * service's entry point.
     */
    public getHandler(): EncoreRawHandler {
        if (!this.driver) {
            throw new Error("Encore server not initialized. Call run() first.");
        }
        return this.driver.handle.bind(this.driver);
    }

    /**
     * Encore.ts services don't "listen" like traditional servers - the Encore runtime starts
     * listening as soon as the process boots and API endpoints are registered. We simulate the
     * startup lifecycle here so Node-Boot's lifecycle events and banner are still published.
     */
    public async listen(): Promise<NodeBootAppView> {
        const context = ApplicationContext.get();

        this.logger.info(`=================================`);
        this.logger.info(`======= ENV: ${context.applicationOptions.environment} =======`);
        this.logger.info(`🚀 Encore.ts raw endpoint handler ready`);
        this.logger.info(`=================================`);

        // mark the server as started
        super.started();

        return this.appView();
    }

    public async close(): Promise<void> {
        this.logger.info("Encore server shutdown initiated");
        // Call the enhanced cleanup method
        await this.cleanup();
        this.logger.info("Encore server closed successfully");
    }

    override async configureHttpLogging(): Promise<void> {
        this.logger.info("Configuring HTTP logging for EncoreServer.");
        // The actual request logging is handled by the EncoreDriver.
    }

    override getHttpServer(): any {
        return undefined; // Encore.ts owns the HTTP server; Node-Boot doesn't have direct access to it
    }

    override getFramework(): void {
        return undefined; // Encore.ts doesn't expose a framework instance to plug into
    }

    override getRouter(): Instance<HTTPVersion.V1> {
        return this.router;
    }
}
