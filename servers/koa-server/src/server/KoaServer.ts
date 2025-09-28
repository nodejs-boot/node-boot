import {ApplicationContext, JsonObject} from "@nodeboot/context";
import Koa from "koa";
import Router from "@koa/router";
import {BaseServer, NodeBootAppView} from "@nodeboot/core";
import {NodeBootToolkit} from "@nodeboot/engine";
import {KoaDriver} from "../driver";
import http from "http";
import {KoaServerConfigs} from "../types";
import {Server} from "node:http";

export class KoaServer extends BaseServer<Koa, Router> {
    private readonly framework: Koa;
    private readonly router: Router;
    private serverInstance: http.Server;

    constructor() {
        super("koa");
        this.framework = new Koa();
        this.router = new Router();
    }

    override async configureHttpLogging(): Promise<void> {
        // Koa middleware to log incoming request
        this.framework.use(async (ctx, next) => {
            if (this.shouldLog(ctx.originalUrl)) {
                const logMessage = `==> Incoming http request: ${ctx.method} ${ctx.originalUrl} | ${ctx.ip} | ${ctx.headers["user-agent"]}`;
                this.logger.info(logMessage);
            }
            await next(); // Proceed to the next middleware/route handler
        });

        // Your existing request logger middleware
        this.framework.use(async (ctx, next) => {
            const start = Date.now();
            await next();
            if (this.shouldLog(ctx.originalUrl)) {
                const responseTime = Date.now() - start;
                const logMessage = `<== Outgoing http response: ${ctx.method} ${ctx.originalUrl} ${ctx.status} - ${responseTime}ms | ${ctx.ip} | ${ctx.headers["user-agent"]}`;
                this.logger.info(logMessage);
            }
        });
    }

    async run(additionalConfig?: JsonObject): Promise<KoaServer> {
        const context = ApplicationContext.get();

        await this.configure(this.framework, this.router, additionalConfig);

        // Bind application container through adapter
        if (context.applicationAdapter) {
            const engineOptions = context.applicationAdapter.bind(context.diOptions?.iocContainer);

            const serverConfigs = this.getServerConfigurations<KoaServerConfigs>();
            if (!serverConfigs) {
                this.logger.warn(
                    `No Server configurations provided for Koa . To enable server configurations for CORS, Session, Multipart, Cookie and Templating, consider creating a @Bean(SERVER_CONFIGURATIONS) that returns an "KoaServerConfigs" object`,
                );
            }

            const driver = new KoaDriver({
                configs: serverConfigs,
                koa: this.framework,
                logger: this.logger,
                router: this.router,
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
                this.serverInstance = this.framework.listen(context.applicationOptions.port ?? 3000, "0.0.0.0", () => {
                    this.logger.info(`=================================`);
                    this.logger.info(`======= ENV: ${context.applicationOptions.environment} =======`);
                    this.logger.info(`🚀 App listening on the port ${context.applicationOptions.port}`);
                    this.logger.info(`=================================`);
                    // mark the server as started
                    super.started();
                    // Server initialized
                    resolve(this.appView());
                });
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
                    this.logger.error("NodeBoot Koa Server closed with error", err);
                    reject(err);
                } else {
                    this.logger.info("NodeBoot Koa Server closed successfully");
                    // Call the enhanced cleanup method
                    await this.cleanup();
                    resolve();
                }
            });
        });
    }

    override getHttpServer(): Server {
        return this.serverInstance;
    }

    getFramework(): Koa {
        return this.framework;
    }

    getRouter(): Router {
        return this.router;
    }
}
