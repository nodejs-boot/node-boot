import {ActuatorAdapter, ActuatorOptions} from "@node-boot/context";
import express from "express";
import {InfoService} from "../service/InfoService";
import {MetricsContext} from "../types";
import {MetadataService} from "../service/MetadataService";
import {ConfigService} from "@node-boot/config";

export class ExpressActuatorAdapter implements ActuatorAdapter {
    constructor(
        private readonly context: MetricsContext,
        private readonly infoService: InfoService,
        private readonly metadataService: MetadataService,
        private readonly configService?: ConfigService,
    ) {}

    bind(
        options: ActuatorOptions,
        server: express.Application,
        router: express.Application,
    ): void {
        router.use((req, res, next) => {
            // Start a timer for every request made
            res.locals.startEpoch = Date.now();

            res.once("finish", () => {
                const responseTimeInMilliseconds =
                    Date.now() - res.locals.startEpoch;

                this.context.http_request_duration_milliseconds
                    .labels(req.method, req.path, res.statusCode)
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

        router.get("/actuator", (req, res) => {
            res.status(200).json(this.metadataService.getActuatorEndpoints());
        });

        router.get("/actuator/info", (req, res) => {
            this.infoService.getInfo().then(data => res.status(200).json(data));
        });

        router.get("/actuator/config", (req, res) => {
            res.status(200).json(this.configService?.get() ?? {});
        });

        router.get("/actuator/memory", (req, res) => {
            this.infoService
                .getMemory()
                .then(data => res.status(200).json(data));
        });

        router.get("/actuator/metrics", (req, res) => {
            this.context.register
                .getMetricsAsJSON()
                .then(data => res.status(200).json(data));
        });

        router.get("/actuator/prometheus", (req, res) => {
            res.setHeader("Content-Type", this.context.register.contentType);
            this.context.register
                .metrics()
                .then(data => res.status(200).send(data));
        });

        router.get("/actuator/controllers", (req, res) => {
            res.status(200).json(this.metadataService.getControllers());
        });

        router.get("/actuator/interceptors", (req, res) => {
            res.status(200).json(this.metadataService.getInterceptors());
        });

        router.get("/actuator/middlewares", (req, res) => {
            res.status(200).json(this.metadataService.getMiddlewares());
        });
    }
}
