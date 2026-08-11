import {ApplicationContext, JsonObject} from "@nodeboot/context";
import {BaseServer, NodeBootAppView} from "@nodeboot/core";
import {NodeBootToolkit} from "@nodeboot/engine";
import Router, {HTTPVersion, Instance} from "find-my-way";
import {VercelDriver} from "../driver";
import {VercelHandler} from "../types";

export class VercelServer extends BaseServer<any, Instance<HTTPVersion.V1>> {
    // Controller actions are registered with a trailing slash for their index route (e.g.
    // `@Controller("/hello")` + `@Get("/")` builds the route "/hello/"), but incoming request
    // URLs typically omit it (e.g. `/api/hello`). `ignoreTrailingSlash` makes find-my-way treat
    // both forms as equivalent so routes match regardless of how the client requests them.
    private readonly router = Router({ignoreTrailingSlash: true});
    private driver: VercelDriver | null = null;

    constructor() {
        super("vercel");
    }

    async run(additionalConfig?: JsonObject): Promise<VercelServer> {
        const context = ApplicationContext.get();
        await super.configure(undefined, this.router, additionalConfig);

        if (context.applicationAdapter) {
            const engineOptions = context.applicationAdapter.bind(context.diOptions?.iocContainer);

            this.driver = new VercelDriver({
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
     * Returns the handler function that can be exported as a Vercel Node.js Serverless Function,
     * e.g. `export default server.getHandler()` from your `api/[...path].ts` entry point.
     */
    public getHandler(): VercelHandler {
        if (!this.driver) {
            throw new Error("Vercel server not initialized. Call run() first.");
        }
        return this.driver.handle.bind(this.driver);
    }

    /**
     * Vercel Serverless Functions don't "listen" like traditional servers, but we can simulate startup
     */
    public async listen(): Promise<NodeBootAppView> {
        const context = ApplicationContext.get();

        this.logger.info(`=================================`);
        this.logger.info(`======= ENV: ${context.applicationOptions.environment} =======`);
        this.logger.info(`🚀 Vercel Serverless Function handler ready for deployment`);
        this.logger.info(`=================================`);

        // mark the server as started
        super.started();

        return this.appView();
    }

    public async close(): Promise<void> {
        this.logger.info("Vercel server shutdown initiated");
        // Call the enhanced cleanup method
        await this.cleanup();
        this.logger.info("Vercel server closed successfully");
    }

    override async configureHttpLogging(): Promise<void> {
        this.logger.info("Configuring HTTP logging for VercelServer.");
        // The actual request logging is handled by the VercelDriver.
    }

    override getHttpServer(): any {
        return undefined; // Vercel Serverless Functions don't have a traditional HTTP server
    }

    override getFramework(): void {
        return undefined; // Vercel Serverless Functions don't use a framework instance
    }

    override getRouter(): Instance<HTTPVersion.V1> {
        return this.router;
    }
}
