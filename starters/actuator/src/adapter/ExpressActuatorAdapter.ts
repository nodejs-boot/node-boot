import {ActuatorAdapter, ActuatorOptions, CoreInfoService, HealthService} from "@nodeboot/context";
import {Application, Response, Router} from "express";
import {GitService} from "../service/GitService";
import {MetricsContext} from "../types";
import {MetadataService} from "../service/MetadataService";
import {ConfigService} from "@nodeboot/config";

type ResWithEpoch = Response & {locals: {startEpoch: number}};

export class ExpressActuatorAdapter implements ActuatorAdapter {
    constructor(
        private readonly context: MetricsContext,
        private readonly gitService: GitService,
        private readonly metadataService: MetadataService,
        private readonly configService: ConfigService,
        private readonly infoService: CoreInfoService,
        private readonly healthService: HealthService,
    ) {}

    bind(_options: ActuatorOptions, _server: Application, router: Router): void {
        router.use((req, res: ResWithEpoch, next) => {
            // Start a timer for every request made
            res.locals.startEpoch = Date.now();

            res.once("finish", () => {
                const responseTimeInMilliseconds = Date.now() - res.locals.startEpoch;

                const labels = {
                    method: req.method,
                    route: req.originalUrl,
                    statusCode: res.statusCode,
                };

                setImmediate(() => {
                    // Offload the metrics recording to the event loop
                    this.context.http_request_duration_milliseconds
                        .labels(labels.method, labels.route, labels.statusCode.toString())
                        .observe(responseTimeInMilliseconds);

                    this.context.http_request_counter.labels(labels).inc();
                });
            });
            next();
        });

        router.get("/actuator", async (_, res) => {
            res.status(200).json(this.metadataService.getActuatorEndpoints());
        });

        router.get("/actuator/info", async (_, res) => {
            this.infoService.getInfo().then(data => res.status(200).json(data));
        });

        router.get("/actuator/git", async (_, res) => {
            this.gitService.getGit("simple").then(data => res.status(200).json(data));
        });

        router.get("/actuator/config", async (_, res) => {
            res.status(200).json(this.configService?.get() ?? {});
        });

        router.get("/actuator/memory", async (_, res) => {
            this.infoService.getMemory().then(data => res.status(200).json(data));
        });

        router.get("/actuator/metrics", async (_, res) => {
            this.context.register.getMetricsAsJSON().then(data => res.status(200).json(data));
        });

        router.get("/actuator/prometheus", async (_, res) => {
            res.setHeader("Content-Type", this.context.register.contentType);
            this.context.register.metrics().then(data => res.status(200).send(data));
        });

        router.get("/actuator/controllers", async (_, res) => {
            res.status(200).json(this.metadataService.getControllers());
        });

        router.get("/actuator/interceptors", async (_, res) => {
            res.status(200).json(this.metadataService.getInterceptors());
        });

        router.get("/actuator/middlewares", async (_, res) => {
            res.status(200).json(this.metadataService.getMiddlewares());
        });

        // health
        router.get("/actuator/health", async (_, res) => {
            const [readiness, liveness] = await Promise.all([
                this.healthService.getReadiness(),
                this.healthService.getLiveness(),
            ]);
            res.status(200).json({
                readinessPath: "/actuator/health/readiness",
                livenessPath: "/actuator/health/liveness",
                readiness,
                liveness,
            });
        });

        router.get("/actuator/health/readiness", async (_, res) => {
            const {status, payload} = await this.healthService.getReadiness();
            res.status(status).json(payload);
        });

        router.get("/actuator/health/liveness", async (_, res) => {
            const {status, payload} = await this.healthService.getLiveness();
            res.status(status).json(payload);
        });
    }
}
