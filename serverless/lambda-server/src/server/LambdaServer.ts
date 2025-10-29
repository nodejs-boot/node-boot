import {ApplicationContext, JsonObject} from "@nodeboot/context";
import {BaseServer, NodeBootAppView} from "@nodeboot/core";
import {NodeBootToolkit} from "@nodeboot/engine";
import Router, {HTTPVersion, Instance} from "find-my-way";
import {LambdaDriver} from "../driver";
import {LambdaHandler} from "../types";

export class LambdaServer extends BaseServer<any, Instance<HTTPVersion.V1>> {
    private readonly router = Router();
    private driver: LambdaDriver | null = null;

    constructor() {
        super("lambda");
    }

    async run(additionalConfig?: JsonObject): Promise<LambdaServer> {
        const context = ApplicationContext.get();
        await super.configure(undefined, this.router, additionalConfig);

        if (context.applicationAdapter) {
            const engineOptions = context.applicationAdapter.bind(context.diOptions?.iocContainer);

            this.driver = new LambdaDriver({
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
     * Returns the Lambda handler function that can be exported for AWS Lambda
     */
    public getHandler(): LambdaHandler {
        if (!this.driver) {
            throw new Error("Lambda server not initialized. Call run() first.");
        }
        return this.driver.handle.bind(this.driver);
    }

    /**
     * For Lambda, we don't "listen" like traditional servers, but we can simulate startup
     */
    public async listen(): Promise<NodeBootAppView> {
        const context = ApplicationContext.get();

        this.logger.info(`=================================`);
        this.logger.info(`======= ENV: ${context.applicationOptions.environment} =======`);
        this.logger.info(`🚀 Lambda handler ready for deployment`);
        this.logger.info(`=================================`);

        // mark the server as started
        super.started();

        return this.appView();
    }

    public async close(): Promise<void> {
        this.logger.info("Lambda server shutdown initiated");
        // Call the enhanced cleanup method
        await this.cleanup();
        this.logger.info("Lambda server closed successfully");
    }

    override async configureHttpLogging(): Promise<void> {
        this.logger.info("Configuring HTTP logging for LambdaServer.");
        // The actual request logging is handled by the LambdaDriver.
    }

    override getHttpServer(): any {
        return undefined; // Lambda doesn't have a traditional HTTP server
    }

    override getFramework(): void {
        return undefined; // Lambda doesn't use a framework instance
    }

    override getRouter(): Instance<HTTPVersion.V1> {
        return this.router;
    }
}
