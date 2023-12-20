import {ApplicationContext} from "@node-boot/context";
import Koa from "koa";
import Router from "@koa/router";
import {BaseServer} from "@node-boot/core";
import {NodeBootToolkit} from "@node-boot/engine";
import {KoaDriver} from "../driver";

export class KoaServer extends BaseServer<Koa, Router> {
    private readonly framework: Koa;
    private readonly router: Router;

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
            const configs = context.applicationAdapter.bind(context.diOptions?.iocContainer);

            const driver = new KoaDriver(this.framework, this.router);
            NodeBootToolkit.createServer(driver, configs);
        } else {
            throw new Error("Error stating Application. Please enable NodeBoot application using @NodeBootApplication");
        }

        return this;
    }

    public listen() {
        const context = ApplicationContext.get();

        this.framework.listen(context.applicationOptions.port, () => {
            this.logger.info(`=================================`);
            this.logger.info(`======= ENV: ${context.applicationOptions.environment} =======`);
            this.logger.info(`🚀 App listening on the port ${context.applicationOptions.port}`);
            this.logger.info(`=================================`);
        });
    }

    getFramework(): Koa {
        return this.framework;
    }

    getRouter(): Router {
        return this.router;
    }
}
