import {ActuatorAdapter, ActuatorOptions, CoreInfoService, HealthService} from "@nodeboot/context";
import {GitService} from "../service/GitService";
import {MetricsContext} from "../types";
import {MetadataService} from "../service/MetadataService";
import {ConfigService} from "@nodeboot/config";
import Koa from "koa";
import Router from "@koa/router";

export class KoaActuatorAdapter implements ActuatorAdapter {
    constructor(
        private readonly context: MetricsContext,
        private readonly gitService: GitService,
        private readonly metadataService: MetadataService,
        private readonly configService: ConfigService,
        private readonly infoService: CoreInfoService,
        private readonly healthService: HealthService,
    ) {}

    bind(_options: ActuatorOptions, _server: Koa, router: Router): void {
        router.use(async (ctx, next) => {
            // Start a timer for every request made
            // Start a timer for every request made
            ctx.state["startEpoch"] = Date.now();

            await next();

            const responseTimeInMilliseconds = Date.now() - ctx.state["startEpoch"];
            const labels = {
                method: ctx.method,
                route: ctx.originalUrl,
                statusCode: ctx.status,
            };

            setImmediate(() => {
                this.context.http_request_duration_milliseconds
                    .labels(ctx.method, ctx._matchedRoute?.toString() || ctx.path, ctx.status.toString())
                    .observe(responseTimeInMilliseconds);

                this.context.http_request_counter.labels(labels).inc();
            });
        });

        router.get("/actuator", async ctx => {
            const data = this.metadataService.getActuatorEndpoints();
            ctx.status = 200;
            ctx.body = data;
        });

        router.get("/actuator/info", async ctx => {
            const data = await this.infoService.getInfo();
            ctx.status = 200;
            ctx.body = data;
        });

        router.get("/actuator/git", async ctx => {
            const gitInfo = await this.gitService.getGit("simple");
            ctx.status = 200;
            ctx.body = gitInfo;
        });

        router.get("/actuator/config", async ctx => {
            ctx.status = 200;
            ctx.body = this.configService?.get() ?? {};
        });

        router.get("/actuator/memory", async ctx => {
            const data = await this.infoService.getMemory();
            ctx.status = 200;
            ctx.body = data;
        });

        router.get("/actuator/metrics", async ctx => {
            const data = await this.context.register.getMetricsAsJSON();
            ctx.status = 200;
            ctx.body = data;
        });

        router.get("/actuator/prometheus", async ctx => {
            ctx.set("Content-Type", this.context.register.contentType);
            const data = await this.context.register.metrics();
            ctx.status = 200;
            ctx.body = data;
        });

        router.get("/actuator/controllers", async ctx => {
            ctx.status = 200;
            ctx.body = this.metadataService.getControllers();
        });

        router.get("/actuator/interceptors", async ctx => {
            ctx.status = 200;
            ctx.body = this.metadataService.getInterceptors();
        });

        router.get("/actuator/middlewares", async ctx => {
            ctx.status = 200;
            ctx.body = this.metadataService.getMiddlewares();
        });

        // health
        router.get("/actuator/health", async ctx => {
            const [readiness, liveness] = await Promise.all([
                this.healthService.getReadiness(),
                this.healthService.getLiveness(),
            ]);
            ctx.status = 200;
            ctx.body = {
                readinessPath: "/actuator/health/readiness",
                livenessPath: "/actuator/health/liveness",
                readiness,
                liveness,
            };
        });

        router.get("/actuator/health/readiness", async ctx => {
            const {status, payload} = await this.healthService.getReadiness();
            ctx.status = status;
            ctx.body = payload;
        });

        router.get("/actuator/health/liveness", async ctx => {
            const {status, payload} = await this.healthService.getLiveness();
            ctx.status = status;
            ctx.body = payload;
        });
    }
}
