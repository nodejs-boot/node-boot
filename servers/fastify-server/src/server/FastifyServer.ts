import {ApplicationContext, JsonObject} from "@node-boot/context";
import {BaseServer} from "@node-boot/core";
import Fastify, {FastifyInstance} from "fastify";
import {FastifyDriver} from "../driver";
import {NodeBootToolkit} from "@node-boot/engine";
import {NodeBootAppView} from "@node-boot/core/src/server/NodeBootApp";
import {FastifyServerConfigs} from "../types";

export class FastifyServer extends BaseServer<FastifyInstance, FastifyInstance> {
    private readonly framework: FastifyInstance;
    private readonly activeConnections = new Set();

    constructor() {
        super("fastify");
        this.framework = Fastify({logger: true, forceCloseConnections: true});
        this.framework.decorateRequest("locals", {});

        // Track all connections
        this.framework.server.on("connection", socket => {
            this.activeConnections.add(socket);
            socket.on("close", () => this.activeConnections.delete(socket));
        });
    }

    async run(additionalConfig?: JsonObject): Promise<FastifyServer> {
        const context = ApplicationContext.get();

        await super.configure(this.framework, this.framework, additionalConfig);

        // Bind application container through adapter
        if (context.applicationAdapter) {
            const engineOptions = context.applicationAdapter.bind(context.diOptions?.iocContainer);

            const serverConfigs = this.getServerConfigurations<FastifyServerConfigs>();
            if (!serverConfigs) {
                this.logger.warn(
                    `No Server configurations provided for Fastify . To enable server configurations for CORS, Session, Multipart, Cookie and Templating, consider creating a @Bean(SERVER_CONFIGURATIONS) that returns an "FastifyServerConfigs" object`,
                );
            }

            const driver = new FastifyDriver({
                configs: serverConfigs,
                fastify: this.framework,
                logger: this.logger,
            });

            NodeBootToolkit.createServer(driver, engineOptions);
        } else {
            throw new Error("Error stating Application. Please enable NodeBoot application using @NodeBootApplication");
        }

        return this;
    }

    public async listen(): Promise<NodeBootAppView> {
        return new Promise((resolve, reject) => {
            const context = ApplicationContext.get();
            this.framework.listen({port: context.applicationOptions.port}, (err: Error | null, address: string) => {
                if (err) {
                    this.logger.error(err);
                    reject(err);
                    process.exit(1);
                } else {
                    this.logger.info(`=================================`);
                    this.logger.info(`======= ENV: ${context.applicationOptions.environment} =======`);
                    this.logger.info(`🚀 App listening on ${address}`);
                    this.logger.info(`=================================`);
                    // Server initialized
                    resolve(this.appView());
                }
            });
        });
    }

    public async close(): Promise<void> {
        // Forcefully close all active connections
        this.activeConnections.forEach((socket: any) => socket.destroy());

        await this.framework?.close();
    }

    getFramework(): FastifyInstance {
        return this.framework;
    }

    getRouter(): FastifyInstance {
        return this.framework;
    }
}
