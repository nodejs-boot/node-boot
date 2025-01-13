import {ApplicationContext, JsonObject} from "@node-boot/context";
import Koa from "koa";
import Router from "@koa/router";
import {BaseServer} from "@node-boot/core";
import {NodeBootToolkit} from "@node-boot/engine";
import {KoaDriver} from "../driver";
import http from "http";
import {NodeBootAppView} from "@node-boot/core/src/server/NodeBootApp";
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
                this.serverInstance = this.framework.listen(context.applicationOptions.port, () => {
                    this.logger.info(`=================================`);
                    this.logger.info(`======= ENV: ${context.applicationOptions.environment} =======`);
                    this.logger.info(`🚀 App listening on the port ${context.applicationOptions.port}`);
                    this.logger.info(`=================================`);
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
            this.serverInstance.close(err => {
                if (err) {
                    console.error("Error stopping the server:", err);
                    reject(err);
                } else {
                    console.log("Server has been stopped.");
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
