import {ApplicationContext} from "@node-boot/context";
import {BaseServer} from "@node-boot/core";
import Fastify, {FastifyInstance} from "fastify";
import {FastifyDriver} from "../driver";
import {NodeBootToolkit} from "@node-boot/engine";
import {FastifyServerConfigs} from "../driver/FastifyDriver";

export class FastifyServer extends BaseServer<FastifyInstance, FastifyInstance> {
    private readonly framework: FastifyInstance;

    constructor() {
        super("fastify");
        this.framework = Fastify({logger: true});
        this.framework.decorateRequest("locals", {});
    }

    async run(): Promise<FastifyServer> {
        const context = ApplicationContext.get();

        await super.configure(this.framework, this.framework);

        // Bind application container through adapter
        if (context.applicationAdapter) {
            const engineOptions = context.applicationAdapter.bind(context.diOptions?.iocContainer);
            const serverConfigs: FastifyServerConfigs = {};

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

    public async listen(): Promise<void> {
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
                    resolve();
                }
            });
        });
    }

    public async close() {
        await this.framework?.close();
    }

    getFramework(): FastifyInstance {
        return this.framework;
    }

    getRouter(): FastifyInstance {
        return this.framework;
    }
}
