import http, {IncomingMessage, ServerResponse} from "node:http";

import {ActuatorAdapter, ActuatorOptions, CoreInfoService, HealthService} from "@nodeboot/context";
import {GitService} from "../service/GitService";
import {MetricsContext} from "../types";
import {MetadataService} from "../service/MetadataService";
import {ConfigService} from "@nodeboot/config";

export class HttpActuatorAdapter implements ActuatorAdapter {
    private router: any;

    constructor(
        private readonly context: MetricsContext,
        private readonly gitService: GitService,
        private readonly metadataService: MetadataService,
        private readonly configService: ConfigService,
        private readonly infoService: CoreInfoService,
        private readonly healthService: HealthService,
    ) {}

    bind(_: ActuatorOptions, server: http.Server, router: any): void {
        this.router = router;
        this.registerRoutes();

        server.on("request", (req: IncomingMessage, res: ServerResponse) => {
            (req as any).locals = {};
            (req as any).locals.startEpoch = Date.now();

            const originalEnd = res.end.bind(res);

            // capture 'this' (the class instance) in 'self'
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            const self = this;

            res.end = function (
                chunk?: any,
                encodingOrCallback?: BufferEncoding | (() => void),
                callback?: () => void,
            ): typeof res {
                let encoding: BufferEncoding | undefined;
                let cb: (() => void) | undefined;

                if (typeof encodingOrCallback === "function") {
                    cb = encodingOrCallback;
                    encoding = undefined;
                } else {
                    encoding = encodingOrCallback;
                    cb = callback;
                }

                const responseTimeInMs = Date.now() - (req as any).locals.startEpoch;

                setImmediate(() => {
                    // Use 'self' here to access class fields
                    self.context.http_request_duration_milliseconds
                        .labels(req.method || "UNKNOWN", (req as any).url || "UNKNOWN", res.statusCode.toString())
                        .observe(responseTimeInMs);

                    self.context.http_request_counter
                        .labels({
                            method: req.method || "UNKNOWN",
                            route: (req as any).url || "UNKNOWN",
                            statusCode: res.statusCode,
                        })
                        .inc();
                });

                return originalEnd(chunk, encoding as any, cb);
            };
        });
    }

    private registerRoutes() {
        this.router.get("/actuator", (_req: IncomingMessage, res: ServerResponse) => {
            res.writeHead(200, {"Content-Type": "application/json"});
            res.end(JSON.stringify(this.metadataService.getActuatorEndpoints()));
        });

        this.router.get("/actuator/info", async (_req: IncomingMessage, res: ServerResponse) => {
            const data = await this.infoService.getInfo();
            res.writeHead(200, {"Content-Type": "application/json"});
            res.end(JSON.stringify(data));
        });

        this.router.get("/actuator/git", async (_req: IncomingMessage, res: ServerResponse) => {
            const data = await this.gitService.getGit("simple");
            res.writeHead(200, {"Content-Type": "application/json"});
            res.end(JSON.stringify(data));
        });

        this.router.get("/actuator/config", (_req: IncomingMessage, res: ServerResponse) => {
            const config = this.configService?.get() ?? {};
            res.writeHead(200, {"Content-Type": "application/json"});
            res.end(JSON.stringify(config));
        });

        this.router.get("/actuator/memory", async (_req: IncomingMessage, res: ServerResponse) => {
            const data = await this.infoService.getMemory();
            res.writeHead(200, {"Content-Type": "application/json"});
            res.end(JSON.stringify(data));
        });

        this.router.get("/actuator/metrics", async (_req: IncomingMessage, res: ServerResponse) => {
            const data = await this.context.register.getMetricsAsJSON();
            res.writeHead(200, {"Content-Type": "application/json"});
            res.end(JSON.stringify(data));
        });

        this.router.get("/actuator/prometheus", async (_req: IncomingMessage, res: ServerResponse) => {
            res.setHeader("Content-Type", this.context.register.contentType);
            const data = await this.context.register.metrics();
            res.writeHead(200);
            res.end(data);
        });

        this.router.get("/actuator/controllers", (_req: IncomingMessage, res: ServerResponse) => {
            res.writeHead(200, {"Content-Type": "application/json"});
            res.end(JSON.stringify(this.metadataService.getControllers()));
        });

        this.router.get("/actuator/interceptors", (_req: IncomingMessage, res: ServerResponse) => {
            res.writeHead(200, {"Content-Type": "application/json"});
            res.end(JSON.stringify(this.metadataService.getInterceptors()));
        });

        this.router.get("/actuator/middlewares", (_req: IncomingMessage, res: ServerResponse) => {
            res.writeHead(200, {"Content-Type": "application/json"});
            res.end(JSON.stringify(this.metadataService.getMiddlewares()));
        });

        // Health endpoints
        this.router.get("/actuator/health", async (_req: IncomingMessage, res: ServerResponse) => {
            const [readiness, liveness] = await Promise.all([
                this.healthService.getReadiness(),
                this.healthService.getLiveness(),
            ]);
            res.writeHead(200, {"Content-Type": "application/json"});
            res.end(
                JSON.stringify({
                    readinessPath: "/actuator/health/readiness",
                    livenessPath: "/actuator/health/liveness",
                    readiness,
                    liveness,
                }),
            );
        });

        this.router.get("/actuator/health/readiness", async (_req: IncomingMessage, res: ServerResponse) => {
            const {status, payload} = await this.healthService.getReadiness();
            res.writeHead(status, {"Content-Type": "application/json"});
            res.end(JSON.stringify(payload));
        });

        this.router.get("/actuator/health/liveness", async (_req: IncomingMessage, res: ServerResponse) => {
            const {status, payload} = await this.healthService.getLiveness();
            res.writeHead(status, {"Content-Type": "application/json"});
            res.end(JSON.stringify(payload));
        });
    }
}
