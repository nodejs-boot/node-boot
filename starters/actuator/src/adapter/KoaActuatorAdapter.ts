import { ActuatorAdapter, ActuatorOptions } from "@node-boot/context";
import { InfoService } from "../service/InfoService";
import { MetricsContext } from "../types";
import { MetadataService } from "../service/MetadataService";
import { ConfigService } from "@node-boot/config";
import Koa from "koa";
import Router from "@koa/router";

export class KoaActuatorAdapter implements ActuatorAdapter {
  constructor(
    private readonly context: MetricsContext,
    private readonly infoService: InfoService,
    private readonly metadataService: MetadataService,
    private readonly configService?: ConfigService
  ) {}

  bind(options: ActuatorOptions, server: Koa, router: Router): void {
    router.use(async (ctx, next) => {
      // Start a timer for every request made
      // Start a timer for every request made
      ctx.state["startEpoch"] = Date.now();

      await next();

      const responseTimeInMilliseconds = Date.now() - ctx.state["startEpoch"];

      this.context.http_request_duration_milliseconds
        .labels(ctx.method, ctx.path, ctx.status.toString())
        .observe(responseTimeInMilliseconds);

      // Increment the HTTP request counter
      this.context.http_request_counter
        .labels({
          method: ctx.method,
          route: ctx.originalUrl,
          statusCode: ctx.status
        })
        .inc();
    });

    router.get("/actuator", async (ctx) => {
      const data = this.metadataService.getActuatorEndpoints();
      ctx.status = 200;
      ctx.body = data;
    });

    router.get("/actuator/info", async (ctx) => {
      const data = await this.infoService.getInfo();
      ctx.status = 200;
      ctx.body = data;
    });

    router.get("/actuator/config", async (ctx) => {
      ctx.status = 200;
      ctx.body = this.configService?.get() ?? {};
    });

    router.get("/actuator/memory", async (ctx) => {
      const data = await this.infoService.getMemory();
      ctx.status = 200;
      ctx.body = data;
    });

    router.get("/actuator/metrics", async (ctx) => {
      const data = await this.context.register.getMetricsAsJSON();
      ctx.status = 200;
      ctx.body = data;
    });

    router.get("/actuator/prometheus", async (ctx) => {
      ctx.set("Content-Type", this.context.register.contentType);
      const data = await this.context.register.metrics();
      ctx.status = 200;
      ctx.body = data;
    });

    router.get("/actuator/controllers", async (ctx) => {
      ctx.status = 200;
      ctx.body = this.metadataService.getControllers();
    });

    router.get("/actuator/interceptors", async (ctx) => {
      ctx.status = 200;
      ctx.body = this.metadataService.getInterceptors();
    });

    router.get("/actuator/middlewares", async (ctx) => {
      ctx.status = 200;
      ctx.body = this.metadataService.getMiddlewares();
    });
  }
}
