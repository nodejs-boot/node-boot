import {ApplicationContext, JsonObject} from "@nodeboot/context";
import {BaseServer, NodeBootAppView} from "@nodeboot/core";
import {NodeBootToolkit} from "@nodeboot/engine";
import {GhostDriver} from "../driver";
import {Server} from "http";

export class GhostServer extends BaseServer<unknown, unknown> {
    private readonly driver: GhostDriver;

    constructor() {
        super("no-server");
        this.driver = new GhostDriver();
    }

    async run(additionalConfig?: JsonObject): Promise<GhostServer> {
        const context = ApplicationContext.get();

        // Configure server - in this case the 'app' is the driver itself.
        await super.configure(this.driver, this.driver, additionalConfig);

        if (context.applicationAdapter) {
            const engineOptions = context.applicationAdapter.bind(context.diOptions?.iocContainer);

            // Create NodeBoot server engine with our driver and engine options
            NodeBootToolkit.createServer(this.driver, engineOptions);
        } else {
            throw new Error(
                "Error starting Application. Please enable NodeBoot application using @NodeBootApplication",
            );
        }

        return this;
    }

    /**
     * No real HTTP listening here.
     * For testing, CLI, or auto-configuration, this resolves immediately.
     */
    public async listen(): Promise<NodeBootAppView> {
        this.logger.info("NoServer running in non-HTTP mode (CLI / test / auto-configuration).");
        super.started();
        return this.appView();
    }

    /**
     * For CLI or tests, simulate shutting down any resources.
     */
    public async close(): Promise<void> {
        this.logger.info("NoServer stopped.");
        super.stopped();
    }

    /**
     * Provide access to the driver to manually execute actions with mock requests.
     */
    getDriver(): GhostDriver {
        return this.driver;
    }

    override async configureHttpLogging(): Promise<void> {
        // If you want to add any HTTP logging hooks or CLI-specific logging here, do it.
    }

    override getHttpServer(): Server {
        // No real HTTP server in this driver, so we return a dummy server.
        return {} as any;
    }

    override getFramework(): unknown {
        // No specific framework in this driver, so we return undefined.
        return undefined;
    }

    override getRouter(): unknown {
        // No specific router in this driver, so we return undefined.
        return undefined;
    }
}
