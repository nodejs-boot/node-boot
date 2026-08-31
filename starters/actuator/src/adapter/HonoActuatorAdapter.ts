import {ActuatorAdapter, ActuatorOptions, CoreInfoService, HealthService} from "@nodeboot/context";
import {GitService} from "../service/GitService";
import {MetricsContext} from "../types";
import {MetadataService} from "../service/MetadataService";
import {ConfigService} from "@nodeboot/config";
import {Context, Hono} from "hono";

export class HonoActuatorAdapter implements ActuatorAdapter {
    constructor(
        private readonly context: MetricsContext,
        private readonly gitService: GitService,
        private readonly metadataService: MetadataService,
        private readonly configService: ConfigService,
        private readonly infoService: CoreInfoService,
        private readonly healthService: HealthService,
    ) {}

    bind(_options: ActuatorOptions, server: Hono, _router: Hono): void {
        server.use(async (c: Context, next) => {
            // Start a timer for every request made
            const startEpoch = Date.now();

            await next();

            const responseTimeInMilliseconds = Date.now() - startEpoch;
            const route = c.req.routePath || c.req.path;
            const labels = {
                method: c.req.method,
                route,
                statusCode: c.res.status,
            };

            setImmediate(() => {
                this.context.http_request_duration_milliseconds
                    .labels(c.req.method, route, c.res.status.toString())
                    .observe(responseTimeInMilliseconds);

                this.context.http_request_counter.labels(labels).inc();
            });
        });

        server.get("/actuator", c => c.json(this.metadataService.getActuatorEndpoints(), 200));

        server.get("/actuator/info", async c => c.json(await this.infoService.getInfo(), 200));

        server.get("/actuator/git", async c => c.json(await this.gitService.getGit("simple"), 200));

        server.get("/actuator/config", c => c.json(this.configService?.get() ?? {}, 200));

        server.get("/actuator/memory", async c => c.json(await this.infoService.getMemory(), 200));

        server.get("/actuator/metrics", async c => c.json(await this.context.register.getMetricsAsJSON(), 200));

        server.get("/actuator/prometheus", async c => {
            c.header("Content-Type", this.context.register.contentType);
            return c.body(await this.context.register.metrics(), 200);
        });

        server.get("/actuator/controllers", c => c.json(this.metadataService.getControllers(), 200));

        server.get("/actuator/interceptors", c => c.json(this.metadataService.getInterceptors(), 200));

        server.get("/actuator/middlewares", c => c.json(this.metadataService.getMiddlewares(), 200));

        // health
        server.get("/actuator/health", async c => {
            const [readiness, liveness] = await Promise.all([
                this.healthService.getReadiness(),
                this.healthService.getLiveness(),
            ]);
            return c.json(
                {
                    readinessPath: "/actuator/health/readiness",
                    livenessPath: "/actuator/health/liveness",
                    readiness,
                    liveness,
                },
                200,
            );
        });

        server.get("/actuator/health/readiness", async c => {
            const {status, payload} = await this.healthService.getReadiness();
            return c.json(payload, status as any);
        });

        server.get("/actuator/health/liveness", async c => {
            const {status, payload} = await this.healthService.getLiveness();
            return c.json(payload, status as any);
        });
    }
}
