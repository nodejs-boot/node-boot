import {ApplicationContext, JsonObject} from "@nodeboot/context";
import {BaseServer, NodeBootAppView} from "@nodeboot/core";
import {NodeBootToolkit} from "@nodeboot/engine";
import {CloudflareDriver} from "../driver";
import {CloudflareEnv, CloudflareHandler} from "../types";
import {createRouter, SimpleRouter} from "../router";

export class CloudflareServer extends BaseServer<any, SimpleRouter> {
    private readonly router = createRouter();
    private driver: CloudflareDriver | null = null;

    constructor() {
        super("cloudflare");
    }

    async run(additionalConfig?: JsonObject): Promise<CloudflareServer> {
        const context = ApplicationContext.get();
        await super.configure(undefined, this.router, additionalConfig);

        if (context.applicationAdapter) {
            const engineOptions = context.applicationAdapter.bind(context.diOptions?.iocContainer);

            this.driver = new CloudflareDriver({
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
     * Returns the fetch handler function that can be exported as the Cloudflare Worker entry point,
     * e.g. `export default {fetch: server.getHandler()}`.
     */
    public getHandler<TEnv extends CloudflareEnv = CloudflareEnv>(): CloudflareHandler<TEnv> {
        if (!this.driver) {
            throw new Error("Cloudflare server not initialized. Call run() first.");
        }
        return this.driver.handle.bind(this.driver);
    }

    /**
     * Cloudflare Workers don't "listen" like traditional servers, but we can simulate startup
     */
    public async listen(): Promise<NodeBootAppView> {
        const context = ApplicationContext.get();

        this.logger.info(`=================================`);
        this.logger.info(`======= ENV: ${context.applicationOptions.environment} =======`);
        this.logger.info(`🚀 Cloudflare Worker handler ready for deployment`);
        this.logger.info(`=================================`);

        // mark the server as started
        super.started();

        return this.appView();
    }

    public async close(): Promise<void> {
        this.logger.info("Cloudflare server shutdown initiated");
        // Call the enhanced cleanup method
        await this.cleanup();
        this.logger.info("Cloudflare server closed successfully");
    }

    override async configureHttpLogging(): Promise<void> {
        this.logger.info("Configuring HTTP logging for CloudflareServer.");
        // The actual request logging is handled by the CloudflareDriver.
    }

    override getHttpServer(): any {
        return undefined; // Cloudflare Workers don't have a traditional HTTP server
    }

    override getFramework(): void {
        return undefined; // Cloudflare Workers don't use a framework instance
    }

    override getRouter(): SimpleRouter {
        return this.router;
    }
}
