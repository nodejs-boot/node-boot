import {ApplicationContext} from "@node-boot/context";
import {BaseServer} from "@node-boot/core";
import Fastify, {FastifyInstance} from "fastify";
import {FastifyDriver} from "../driver";
import {NodeBootToolkit} from "@node-boot/engine";

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
            const configs = context.applicationAdapter.bind(context.diOptions?.iocContainer);

            const driver = new FastifyDriver(
                {
                    cookieOptions: {
                        secret: "my-secret", // for cookies signature
                        hook: "onRequest", // set to false to disable cookie autoparsing or set autoparsing on any of the following hooks: 'onRequest', 'preParsing', 'preHandler', 'preValidation'. default: 'onRequest'
                        parseOptions: {}, // options for parsing cookies
                    },
                    sessionOptions: {
                        secret: "a secret with minimum length of 32 characters",
                    },
                    templateOptions: {
                        engine: {
                            handlebars: require("handlebars"),
                        },
                    },
                    multipartOptions: {},
                },
                this.framework,
            );
            NodeBootToolkit.createServer(driver, configs);
        } else {
            throw new Error("Error stating Application. Please enable NodeBoot application using @NodeBootApplication");
        }

        return this;
    }

    public listen() {
        const context = ApplicationContext.get();

        this.framework.listen({port: context.applicationOptions.port}, (err: Error | null, address: string) => {
            if (err) {
                this.logger.error(err);
                process.exit(1);
            }
            this.logger.info(`=================================`);
            this.logger.info(`======= ENV: ${context.applicationOptions.environment} =======`);
            this.logger.info(`🚀 App listening on ${address}`);
            this.logger.info(`=================================`);
        });
    }

    getFramework(): FastifyInstance {
        return this.framework;
    }

    getRouter(): FastifyInstance {
        return this.framework;
    }
}
