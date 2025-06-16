import {ApplicationContext, JsonObject} from "@nodeboot/context";
import {BaseServer, NodeBootAppView} from "@nodeboot/core";
import {NodeBootToolkit} from "@nodeboot/engine";
import {createServer, Server} from "node:http";
import {HttpDriver} from "../driver";
import {HttpServerConfigs} from "../types";
import Router, {HTTPVersion, Instance} from "find-my-way";

export class HttpServer extends BaseServer<Server, Instance<HTTPVersion.V1>> {
    private readonly server: Server;
    private readonly router = Router();

    constructor() {
        super("native-http");
        this.server = createServer();
    }

    async run(additionalConfig?: JsonObject): Promise<HttpServer> {
        const context = ApplicationContext.get();
        await super.configure(this.server, this.router, additionalConfig);

        if (context.applicationAdapter) {
            const engineOptions = context.applicationAdapter.bind(context.diOptions?.iocContainer);

            const serverConfigs = this.getServerConfigurations<HttpServerConfigs>();
            if (!serverConfigs) {
                this.logger.warn(
                    `No Server configurations provided for HTTP Server . To enable server configurations for CORS, Session, Multipart, Cookie and Templating, consider creating a @Bean(SERVER_CONFIGURATIONS) that returns an "HttpServerConfigs" object`,
                );
            }

            const driver = new HttpDriver({
                logger: this.logger,
                server: this.server,
                router: this.router,
                serverConfigs: serverConfigs,
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
            const port = context.applicationOptions.port || 3000;

            this.server.listen(port, "0.0.0.0", () => {
                this.logger.info(`=================================`);
                this.logger.info(`======= ENV: ${context.applicationOptions.environment} =======`);
                this.logger.info(`🚀 App listening on ${this.server.address()}`);
                this.logger.info(`=================================`);

                // mark the server as started
                super.started();
                // Server initialized
                resolve(this.appView());
            });

            this.server.on("error", err => {
                this.logger.error("Failed to start server", err);
                reject(err);
                process.exit(1);
            });
        });
    }

    public async close(): Promise<void> {
        this.server.close(err => {
            if (err) {
                this.logger.error("NodeBoot HTTP Server closed with error", err);
            } else {
                this.logger.info("NodeBoot HTTP Server closed successfully");
                super.stopped();
            }
        });
    }

    override async configureHttpLogging(): Promise<void> {
        // If you want to add any HTTP logging hooks or specific logging here, do it.
        this.logger.info("Configuring HTTP logging for HttpServer.");
        // The actual request logging is handled by the HttpDriver.
    }

    override getHttpServer(): Server {
        return this.server;
    }

    override getFramework(): Server {
        return this.server;
    }

    override getRouter(): Instance<HTTPVersion.V1> {
        return this.router;
    }
}
