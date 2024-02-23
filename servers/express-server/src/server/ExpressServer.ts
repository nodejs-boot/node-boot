import {ApplicationContext} from "@node-boot/context";
import express from "express";
import {BaseServer} from "@node-boot/core";
import {ExpressDriver} from "../driver";
import {NodeBootToolkit} from "@node-boot/engine";
import {ExpressServerConfigs} from "../driver/ExpressDriver";
import http from "http";
import {NodeBootAppView} from "@node-boot/core/src/server/NodeBootApp";

export class ExpressServer extends BaseServer<express.Application, express.Application> {
    public framework: express.Application;
    private serverInstance: http.Server;

    constructor() {
        super("express");
        this.framework = express();
        this.framework.use(express.json());
        this.framework.use(express.urlencoded({extended: true}));
    }

    async run(port?: number): Promise<ExpressServer> {
        const context = ApplicationContext.get();
        // Force application port at runtime
        if (port) context.applicationOptions.port = port;

        await this.configure(this.getFramework(), this.getRouter());

        // Bind application container through adapter
        if (context.applicationAdapter) {
            const engineOptions = context.applicationAdapter.bind(context.diOptions?.iocContainer);

            const serverConfigs: ExpressServerConfigs = {}; // TODO pass express server configs

            const driver = new ExpressDriver({
                configs: serverConfigs,
                logger: this.logger,
                express: this.framework,
            });
            NodeBootToolkit.createServer(driver, engineOptions);
        } else {
            throw new Error("Error stating Application. Please enable NodeBoot application using @NodeBootApplication");
        }

        return this;
    }

    async listen(): Promise<NodeBootAppView> {
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

    async close(): Promise<void> {
        this.serverInstance?.close();
    }

    getFramework(): express.Application {
        return this.framework;
    }

    getRouter(): express.Application {
        return this.framework;
    }
}
