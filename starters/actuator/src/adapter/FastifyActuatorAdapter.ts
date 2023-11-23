import { ActuatorAdapter, ActuatorOptions } from "@node-boot/context";
import { InfoService } from "../service/InfoService";
import { MetricsContext } from "../types";
import { MetadataService } from "../service/MetadataService";
import { FastifyInstance } from "fastify";
import { ConfigService } from "@node-boot/config";

export class FastifyActuatorAdapter implements ActuatorAdapter {
  constructor(
    private readonly context: MetricsContext,
    private readonly infoService: InfoService,
    private readonly metadataService: MetadataService,
    private readonly configService?: ConfigService
  ) {}

  bind(
    options: ActuatorOptions,
    server: FastifyInstance,
    router: FastifyInstance
  ): void {
    router.addHook("onRequest", (request, reply, done) => {
      // Start a timer for every request made
      request.log.info({ event: "onRequest" }, "Request received");
      request["locals"].startEpoch = Date.now();
      done();
    });

    router.addHook("onSend", (request, reply, payload, done) => {
      // Retrieve data from the request context
      const responseTimeInMilliseconds =
        Date.now() - request["locals"].startEpoch;

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
          statusCode: reply.statusCode
        })
        .inc();

      done();
    });

    router.get("/actuator", (req, res) => {
      res.status(200);
      res.send(this.metadataService.getActuatorEndpoints());
    });

    router.get("/actuator/info", (req, res) => {
      this.infoService.getInfo().then((data) => {
        res.status(200);
        res.send(data);
      });
    });

    router.get("/actuator/config", (req, res) => {
      res.status(200);
      res.send(this.configService?.get() ?? {});
    });

    router.get("/actuator/memory", (req, res) => {
      this.infoService.getMemory().then((data) => {
        res.status(200);
        res.send(data);
      });
    });

    router.get("/actuator/metrics", (req, res) => {
      this.context.register.getMetricsAsJSON().then((data) => {
        res.status(200);
        res.send(data);
      });
    });

    router.get("/actuator/prometheus", (req, res) => {
      res.type(this.context.register.contentType);
      this.context.register.metrics().then((data) => {
        res.status(200);
        res.send(data);
      });
    });

    router.get("/actuator/controllers", (req, res) => {
      res.status(200);
      res.send(this.metadataService.getControllers());
    });

    router.get("/actuator/interceptors", (req, res) => {
      res.status(200);
      res.send(this.metadataService.getInterceptors());
    });

    router.get("/actuator/middlewares", (req, res) => {
      res.status(200);
      res.send(this.metadataService.getMiddlewares());
    });
  }
}
