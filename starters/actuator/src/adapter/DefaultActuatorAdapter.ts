import {
  ActuatorAdapter,
  ActuatorOptions,
  ApplicationContext
} from "@node-boot/context";
import Prometheus from "prom-client";
import { ExpressActuatorAdapter } from "./ExpressActuatorAdapter";
import { InfoService } from "../service/InfoService";
import { MetricsContext } from "../types";
import { MetadataService } from "../service/MetadataService";
import { FastifyActuatorAdapter } from "./FastifyActuatorAdapter";
import { ConfigService } from "@node-boot/config";
import { KoaActuatorAdapter } from "./KoaActuatorAdapter";

export class DefaultActuatorAdapter implements ActuatorAdapter {
  private metricsContext: MetricsContext;

  constructor(
    private readonly register = new Prometheus.Registry(),
    private readonly infoService: InfoService = new InfoService()
  ) {}

  private setupMetrics(options: ActuatorOptions) {
    this.register.setDefaultLabels({
      app: options.appName
    });
    Prometheus.collectDefaultMetrics({ register: this.register });

    // https://squaredup.com/blog/instrument-node-with-prometheus/
    const http_request_counter = new Prometheus.Counter({
      name: "app_http_request_count",
      help: "Count of HTTP requests received by the app",
      labelNames: ["method", "route", "statusCode"]
    });
    this.register.registerMetric(http_request_counter);

    const http_request_duration_milliseconds = new Prometheus.Histogram({
      name: "app_http_request_duration_milliseconds",
      help: "Duration of HTTP requests in milliseconds.",
      labelNames: ["method", "route", "code"],
      buckets: [1, 2, 3, 4, 5, 10, 25, 50, 100, 250, 500, 1000]
    });
    this.register.registerMetric(http_request_duration_milliseconds);

    const context: MetricsContext = {
      register: this.register,
      http_request_duration_milliseconds,
      http_request_counter
    };
    this.metricsContext = context;
    return context;
  }

  bind(options: ActuatorOptions, server: any, router: any): void {
    const context = this.setupMetrics(options);
    const metadataService = new MetadataService();

    const configService =
      ApplicationContext.get().diOptions?.iocContainer.get(ConfigService);

    let frameworkAdapter: ActuatorAdapter;
    switch (options.serverType) {
      case "express":
        frameworkAdapter = new ExpressActuatorAdapter(
          context,
          this.infoService,
          metadataService,
          configService
        );
        break;
      case "koa":
        frameworkAdapter = new KoaActuatorAdapter(
          context,
          this.infoService,
          metadataService,
          configService
        );
        break;
      case "fastify":
        frameworkAdapter = new FastifyActuatorAdapter(
          context,
          this.infoService,
          metadataService,
          configService
        );
        break;
      default:
        throw new Error(
          "Actuator feature is only allowed for express, koa and fastify servers. " +
            "Please remove @EnableActuator from your application"
        );
    }
    frameworkAdapter.bind(options, server, router);
  }
}
