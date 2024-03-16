import {ActuatorAdapter, ActuatorOptions, CoreInfoService} from "@node-boot/context";
import {Application, Response, Router} from "express";
import {GitService} from "../service/GitService";
import {MetricsContext} from "../types";
import {MetadataService} from "../service/MetadataService";
import {ConfigService} from "@node-boot/config";

type ResWithEpoch = Response & {locals: {startEpoch: number}};

export class ExpressActuatorAdapter implements ActuatorAdapter {
    constructor(
        private readonly context: MetricsContext,
        private readonly gitService: GitService,
        private readonly metadataService: MetadataService,
        private readonly configService: ConfigService,
        private readonly infoService: CoreInfoService,
    ) {}

    bind(_options: ActuatorOptions, _server: Application, router: Router): void {
        router.use((req, res: ResWithEpoch, next) => {
            // Start a timer for every request made
            res.locals.startEpoch = Date.now();

            res.once("finish", () => {
                const responseTimeInMilliseconds = Date.now() - res.locals.startEpoch;

                this.context.http_request_duration_milliseconds
                    .labels(req.method, req.path, res.statusCode.toString())
                    .observe(responseTimeInMilliseconds);
            });

            // Increment the HTTP request counter
            this.context.http_request_counter
                .labels({
                    method: req.method,
                    route: req.originalUrl,
                    statusCode: res.statusCode,
                })
                .inc();
            next();
        });

        router.get("/actuator", (_, res) => {
            res.status(200).json(this.metadataService.getActuatorEndpoints());
        });

        router.get("/actuator/info", (_, res) => {
            this.infoService.getInfo().then(data => res.status(200).json(data));
        });

        router.get("/actuator/git", (_, res) => {
            this.gitService.getGit("simple").then(data => res.status(200).json(data));
        });

        router.get("/actuator/config", (_, res) => {
            res.status(200).json(this.configService?.get() ?? {});
        });

        router.get("/actuator/memory", (_, res) => {
            this.infoService.getMemory().then(data => res.status(200).json(data));
        });

        router.get("/actuator/metrics", (_, res) => {
            this.context.register.getMetricsAsJSON().then(data => res.status(200).json(data));
        });

        router.get("/actuator/prometheus", (_, res) => {
            res.setHeader("Content-Type", this.context.register.contentType);
            this.context.register.metrics().then(data => res.status(200).send(data));
        });

        router.get("/actuator/controllers", (_, res) => {
            res.status(200).json(this.metadataService.getControllers());
        });

        router.get("/actuator/interceptors", (_, res) => {
            res.status(200).json(this.metadataService.getInterceptors());
        });

        router.get("/actuator/middlewares", (_, res) => {
            res.status(200).json(this.metadataService.getMiddlewares());
        });
    }
}
