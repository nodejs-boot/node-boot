import {ApplicationContext} from "@node-boot/context";
import {createServer} from "routing-controllers";
import {BaseApplication} from "@node-boot/core";
import Fastify, {FastifyInstance} from "fastify";
import {FastifyDriver} from "./driver/FastifyDriver";

export class FastifyApplication extends BaseApplication<
    FastifyInstance,
    FastifyInstance
> {
    private readonly server: FastifyInstance;

    constructor() {
        super("fastify");
        this.server = Fastify({logger: true});
    }

    async run(): Promise<FastifyApplication> {
        const context = ApplicationContext.get();

        await this.configure(this.server, this.server);

        // Bind application container through adapter
        if (context.applicationAdapter) {
            const configs = context.applicationAdapter.bind(
                context.diOptions?.iocContainer
            );

            const driver = new FastifyDriver(
                {
                    cookieOptions: {
                        secret: "my-secret", // for cookies signature
                        hook: "onRequest", // set to false to disable cookie autoparsing or set autoparsing on any of the following hooks: 'onRequest', 'preParsing', 'preHandler', 'preValidation'. default: 'onRequest'
                        parseOptions: {} // options for parsing cookies
                    },
                    sessionOptions: {
                        secret: "a secret with minimum length of 32 characters"
                    },
                    templateOptions: {
                        engine: {
                            handlebars: require("handlebars")
                        }
                    },
                    fileOptions: {}
                },
                this.server
            );
            createServer(driver, configs);
        } else {
            throw new Error(
                "Error stating Application. Please enable NodeBoot application using @NodeBootApplication"
            );
        }

        return this;
    }

    public listen() {
        const context = ApplicationContext.get();

        this.server.listen(
            {port: context.applicationOptions.port},
            (err: Error | null, address: string) => {
                if (err) {
                    this.logger.error(err);
                    process.exit(1);
                }
                this.logger.info(`=================================`);
                this.logger.info(
                    `======= ENV: ${context.applicationOptions.environment} =======`
                );
                this.logger.info(`🚀 App listening on ${address}`);
                this.logger.info(`=================================`);
            }
        );
    }

    getServer(): FastifyInstance {
        return this.server;
    }

    getRouter(): FastifyInstance {
        return this.server;
    }
}
