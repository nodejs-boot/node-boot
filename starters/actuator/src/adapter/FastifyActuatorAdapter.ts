import {ActuatorAdapter, ActuatorOptions, CoreInfoService, HealthService} from "@nodeboot/context";
import {GitService} from "../service/GitService";
import {MetricsContext} from "../types";
import {MetadataService} from "../service/MetadataService";
import {FastifyInstance} from "fastify";
import {ConfigService} from "@nodeboot/config";

export class FastifyActuatorAdapter implements ActuatorAdapter {
    constructor(
        private readonly context: MetricsContext,
        private readonly gitService: GitService,
        private readonly metadataService: MetadataService,
        private readonly configService: ConfigService,
        private readonly infoService: CoreInfoService,
        private readonly healthService: HealthService,
    ) {}

    bind(_: ActuatorOptions, _instance: FastifyInstance, router: FastifyInstance): void {
        router.addHook("onRequest", (request, _reply, done) => {
            // Start a timer for every request made
            request.log.info({event: "onRequest"}, "Request received");
            request["locals"].startEpoch = Date.now();
            done();
        });

        router.addHook("onSend", (request, reply, payload, done) => {
            // Retrieve data from the request context
            const responseTimeInMilliseconds = Date.now() - request["locals"].startEpoch;

            // Observe response time
            this.context.http_request_duration_milliseconds
                .labels(request.method, request.url, reply.statusCode.toString())
                .observe(responseTimeInMilliseconds);

            done(null, payload);
        });

        router.addHook("onResponse", (request, reply, done) => {
            // Increment the HTTP request counter
            this.context.http_request_counter
                .labels({
                    method: request.method,
                    route: request.url,
                    statusCode: reply.statusCode,
                })
                .inc();

            done();
        });

        router.get("/actuator", (_, res) => {
            res.status(200);
            res.send(this.metadataService.getActuatorEndpoints());
        });

        router.get("/actuator/info", (_, res) => {
            this.infoService.getInfo().then(data => {
                res.status(200);
                res.send(data);
            });
        });

        router.get("/actuator/git", (_, res) => {
            this.gitService.getGit("simple").then(data => {
                res.status(200);
                res.send(data);
            });
        });

        router.get("/actuator/config", (_, res) => {
            res.status(200);
            res.send(this.configService?.get() ?? {});
        });

        router.get("/actuator/memory", (_, res) => {
            this.infoService.getMemory().then(data => {
                res.status(200);
                res.send(data);
            });
        });

        router.get("/actuator/metrics", (_, res) => {
            this.context.register.getMetricsAsJSON().then(data => {
                res.status(200);
                res.send(data);
            });
        });

        router.get("/actuator/prometheus", (_, res) => {
            res.type(this.context.register.contentType);
            this.context.register.metrics().then(data => {
                res.status(200);
                res.send(data);
            });
        });

        router.get("/actuator/controllers", (_, res) => {
            res.status(200);
            res.send(this.metadataService.getControllers());
        });

        router.get("/actuator/interceptors", (_, res) => {
            res.status(200);
            res.send(this.metadataService.getInterceptors());
        });

        router.get("/actuator/middlewares", (_, res) => {
            res.status(200);
            res.send(this.metadataService.getMiddlewares());
        });

        // health
        router.get("/actuator/health", async (_, res) => {
            const readiness = await this.healthService.getReadiness();
            const liveness = await this.healthService.getLiveness();
            res.status(200);
            res.send({
                readinessPath: "/actuator/health/readiness",
                livenessPath: "/actuator/health/liveness",
                readiness,
                liveness,
            });
        });

        router.get("/actuator/health/readiness", async (_, res) => {
            const {status, payload} = await this.healthService.getReadiness();
            res.status(status);
            res.send(payload);
        });

        router.get("/actuator/health/liveness", async (_, res) => {
            const {status, payload} = await this.healthService.getLiveness();
            res.status(status);
            res.send(payload);
        });
    }
}
