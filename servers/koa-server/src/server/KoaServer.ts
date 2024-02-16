import {ApplicationContext} from "@node-boot/context";
import Koa from "koa";
import Router from "@koa/router";
import {BaseServer} from "@node-boot/core";
import {NodeBootToolkit} from "@node-boot/engine";
import {KoaDriver} from "../driver";
import {KoaServerConfigs} from "../driver/KoaDriver";
import http from "http";

export class KoaServer extends BaseServer<Koa, Router> {
    private readonly framework: Koa;
    private readonly router: Router;
    private serverInstance: http.Server;

    constructor() {
        super("koa");
        this.framework = new Koa();
        this.router = new Router();
    }

    async run(): Promise<KoaServer> {
        const context = ApplicationContext.get();

        await this.configure(this.framework, this.router);

        // Bind application container through adapter
        if (context.applicationAdapter) {
            const engineOptions = context.applicationAdapter.bind(context.diOptions?.iocContainer);

            const serverConfigs: KoaServerConfigs = {};

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

    public listen(): Promise<void> {
        return new Promise((resolve, reject) => {
            const context = ApplicationContext.get();

            try {
                this.serverInstance = this.framework.listen(context.applicationOptions.port, () => {
                    this.logger.info(`=================================`);
                    this.logger.info(`======= ENV: ${context.applicationOptions.environment} =======`);
                    this.logger.info(`🚀 App listening on the port ${context.applicationOptions.port}`);
                    this.logger.info(`=================================`);
                    // Server initialized
                    resolve();
                });
            } catch (error) {
                this.logger.error(error);
                reject(error);
            }
        });
    }

    public close() {
        this.serverInstance.close();
    }

    getFramework(): Koa {
        return this.framework;
    }

    getRouter(): Router {
        return this.router;
    }
}
