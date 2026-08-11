import {ApplicationContext, JsonObject} from "@nodeboot/context";
import {BaseServer, NodeBootAppView} from "@nodeboot/core";
import {NodeBootToolkit} from "@nodeboot/engine";
import Router, {HTTPVersion, Instance} from "find-my-way";
import {NetlifyDriver} from "../driver";
import {NetlifyHandler} from "../types";

export class NetlifyServer extends BaseServer<any, Instance<HTTPVersion.V1>> {
    // Controller actions are registered with a trailing slash for their index route (e.g.
    // `@Controller("/hello")` + `@Get("/")` builds the route "/hello/"), but incoming request
    // URLs typically omit it (e.g. `/.netlify/functions/api/hello`). `ignoreTrailingSlash` makes
    // find-my-way treat both forms as equivalent so routes match regardless of how the client requests them.
    private readonly router = Router({ignoreTrailingSlash: true});
    private driver: NetlifyDriver | null = null;

    constructor() {
        super("netlify");
    }

    async run(additionalConfig?: JsonObject): Promise<NetlifyServer> {
        const context = ApplicationContext.get();
        await super.configure(undefined, this.router, additionalConfig);

        if (context.applicationAdapter) {
            const engineOptions = context.applicationAdapter.bind(context.diOptions?.iocContainer);

            this.driver = new NetlifyDriver({
                logger: this.logger,
                router: this.router,
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
     * Returns the handler function that can be exported as a Netlify Function,
     * e.g. `export const handler = server.getHandler()` from your
     * `netlify/functions/api.ts` entry point.
     */
    public getHandler(): NetlifyHandler {
        if (!this.driver) {
            throw new Error("Netlify server not initialized. Call run() first.");
        }
        return this.driver.handle.bind(this.driver);
    }

    /**
     * Netlify Functions don't "listen" like traditional servers, but we can simulate startup
     */
    public async listen(): Promise<NodeBootAppView> {
        const context = ApplicationContext.get();

        this.logger.info(`=================================`);
        this.logger.info(`======= ENV: ${context.applicationOptions.environment} =======`);
        this.logger.info(`🚀 Netlify Function handler ready for deployment`);
        this.logger.info(`=================================`);

        // mark the server as started
        super.started();

        return this.appView();
    }

    public async close(): Promise<void> {
        this.logger.info("Netlify server shutdown initiated");
        // Call the enhanced cleanup method
        await this.cleanup();
        this.logger.info("Netlify server closed successfully");
    }

    override async configureHttpLogging(): Promise<void> {
        this.logger.info("Configuring HTTP logging for NetlifyServer.");
        // The actual request logging is handled by the NetlifyDriver.
    }

    override getHttpServer(): any {
        return undefined; // Netlify Functions don't have a traditional HTTP server
    }

    override getFramework(): void {
        return undefined; // Netlify Functions don't use a framework instance
    }

    override getRouter(): Instance<HTTPVersion.V1> {
        return this.router;
    }
}
