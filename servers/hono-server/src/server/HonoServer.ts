import {ApplicationContext, JsonObject} from "@nodeboot/context";
import {Hono} from "hono";
import {serve, ServerType} from "@hono/node-server";
import {BaseServer, NodeBootAppView} from "@nodeboot/core";
import {NodeBootToolkit} from "@nodeboot/engine";
import {HonoDriver} from "../driver";
import {HonoServerConfigs} from "../types";

export class HonoServer extends BaseServer<Hono, Hono> {
    private readonly framework: Hono;
    private serverInstance: ServerType;

    constructor() {
        super("hono");
        this.framework = new Hono();
    }

    override async configureHttpLogging(): Promise<void> {
        this.framework.use(async (c, next) => {
            const shouldLog = this.shouldLog(c.req.path);
            if (shouldLog) {
                this.logger.info(
                    `==> Incoming http request: ${c.req.method} ${c.req.path} | ${c.req.header("user-agent")}`,
                );
            }
            const start = Date.now();
            await next();
            if (shouldLog) {
                const responseTime = Date.now() - start;
                this.logger.info(
                    `<== Outgoing http response: ${c.req.method} ${c.req.path} ${
                        c.res.status
                    } - ${responseTime}ms | ${c.req.header("user-agent")}`,
                );
            }
        });
    }

    async run(additionalConfig?: JsonObject): Promise<HonoServer> {
        const context = ApplicationContext.get();

        // Hono itself acts as both the framework instance and the router
        await this.configure(this.framework, this.framework, additionalConfig);

        // Bind application container through adapter
        if (context.applicationAdapter) {
            const engineOptions = context.applicationAdapter.bind(context.diOptions?.iocContainer);

            const serverConfigs = this.getServerConfigurations<HonoServerConfigs>();
            if (!serverConfigs) {
                this.logger.warn(
                    `No Server configurations provided for Hono. To enable server configurations for CORS, Session and Multipart, consider creating a @Bean(SERVER_CONFIGURATIONS) that returns an "HonoServerConfigs" object`,
                );
            }

            const driver = new HonoDriver({
                configs: serverConfigs,
                hono: this.framework,
                logger: this.logger,
            });
            NodeBootToolkit.createServer(driver, engineOptions);
        } else {
            throw new Error("Error stating Application. Please enable NodeBoot application using @NodeBootApplication");
        }

        return this;
    }

    public listen(): Promise<NodeBootAppView> {
        return new Promise((resolve, reject) => {
            const context = ApplicationContext.get();
            try {
                this.serverInstance = serve(
                    {
                        fetch: this.framework.fetch,
                        port: context.applicationOptions.port ?? 3000,
                        hostname: "0.0.0.0",
                    },
                    () => {
                        this.logger.info(`=================================`);
                        this.logger.info(`======= ENV: ${context.applicationOptions.environment} =======`);
                        this.logger.info(`🚀 App listening on the port ${context.applicationOptions.port}`);
                        this.logger.info(`=================================`);
                        // mark the server as started
                        super.started();
                        // Server initialized
                        resolve(this.appView());
                    },
                );
            } catch (error) {
                this.logger.error(error);
                reject(error);
            }
        });
    }

    public async close(): Promise<void> {
        if (!this.serverInstance) {
            console.warn("Server instance is not initialized or already stopped.");
            return Promise.resolve();
        }

        return await new Promise<void>((resolve, reject) => {
            this.serverInstance.close(async err => {
                if (err) {
                    this.logger.error("NodeBoot Hono Server closed with error", err);
                    reject(err);
                } else {
                    this.logger.info("NodeBoot Hono Server closed successfully");
                    // Call the enhanced cleanup method
                    await this.cleanup();
                    resolve();
                }
            });
        });
    }

    override getHttpServer(): any {
        return this.serverInstance;
    }

    getFramework(): Hono {
        return this.framework;
    }

    getRouter(): Hono {
        return this.framework;
    }
}
