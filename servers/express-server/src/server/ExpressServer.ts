import {ApplicationContext, JsonObject} from "@nodeboot/context";
import express from "express";
import {BaseServer} from "@nodeboot/core";
import {ExpressDriver} from "../driver";
import {NodeBootToolkit} from "@nodeboot/engine";
import http from "http";
import {NodeBootAppView} from "@nodeboot/core/src/server/NodeBootApp";
import {ExpressServerConfigs} from "../types";
import {Server} from "node:http";

export class ExpressServer extends BaseServer<express.Application, express.Application> {
    public framework: express.Application;
    private serverInstance: http.Server;

    constructor() {
        super("express");
        this.framework = express();
        this.framework.use(express.json());
        this.framework.use(express.urlencoded({extended: true}));
    }

    async run(additionalConfig?: JsonObject): Promise<ExpressServer> {
        const context = ApplicationContext.get();

        await this.configure(this.getFramework(), this.getRouter(), additionalConfig);

        // Bind application container through adapter
        if (context.applicationAdapter) {
            const engineOptions = context.applicationAdapter.bind(context.diOptions?.iocContainer);

            const serverConfig = this.getServerConfigurations<ExpressServerConfigs>();
            if (!serverConfig) {
                this.logger.warn(
                    `No Server configurations provided for Express . To enable server configurations for CORS, Session, Multipart, Cookie and Templating, consider creating a @Bean(SERVER_CONFIGURATIONS) that returns an "ExpressServerConfigs" object`,
                );
            }

            const driver = new ExpressDriver({
                configs: serverConfig,
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

    getFramework(): express.Application {
        return this.framework;
    }

    getRouter(): express.Application {
        return this.framework;
    }
}
