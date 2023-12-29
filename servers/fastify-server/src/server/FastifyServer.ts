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
            const serverConfigs: FastifyServerConfigs = {
                cookie: {
                    enabled: true,
                    options: {
                        secret: "my-secret", // for cookies signature
                        hook: "onRequest", // set to false to disable cookie autoparsing or set autoparsing on any of the following hooks: 'onRequest', 'preParsing', 'preHandler', 'preValidation'. default: 'onRequest'
                        parseOptions: {}, // options for parsing cookies
                    },
                },
                session: {
                    enabled: false,
                    options: {
                        secret: "a secret with minimum length of 32 characters",
                    },
                },
                template: {
                    enabled: false,
                    options: {
                        engine: {
                            handlebars: require("handlebars"),
                        },
                    },
                },
                multipart: {
                    enabled: false,
                },
            };

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

    public listen() {
        const context = ApplicationContext.get();

        this.framework.listen({port: context.applicationOptions.port}, (err: Error | null, address: string) => {
            if (err) {
                this.logger.error(err);
            } else {
                this.logger.info(`=================================`);
                this.logger.info(`======= ENV: ${context.applicationOptions.environment} =======`);
                this.logger.info(`🚀 App listening on ${address}`);
                this.logger.info(`=================================`);
            }
        });
    }

    getFramework(): FastifyInstance {
        return this.framework;
    }

    getRouter(): FastifyInstance {
        return this.framework;
    }
}
