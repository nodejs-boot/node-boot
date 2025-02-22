import {ApplicationContext, JsonObject} from "@nodeboot/context";
import {BaseServer, NodeBootAppView} from "@nodeboot/core";
import Fastify, {FastifyInstance} from "fastify";
import {FastifyDriver} from "../driver";
import {NodeBootToolkit} from "@nodeboot/engine";
import {FastifyServerConfigs} from "../types";
import {Server} from "node:http";

export class FastifyServer extends BaseServer<FastifyInstance, FastifyInstance> {
    private readonly framework: FastifyInstance;

    constructor() {
        super("fastify");
        this.framework = Fastify({logger: true, forceCloseConnections: true});
        this.framework.decorateRequest("locals", {});
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
        this.getHttpServer().close(err => {
            if (err) {
                this.logger.error("Node-Boot Fastify HTTP Server closed with error", err);
            } else {
                this.logger.info("Node-Boot Fastify HTTP Server closed successfully");
            }
        });
    }

    getHttpServer(): Server {
        return this.framework.server;
    }

    getFramework(): FastifyInstance {
        return this.framework;
    }

    getRouter(): FastifyInstance {
        return this.framework;
    }
}
