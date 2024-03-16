import {ActuatorAdapter, ActuatorOptions, ApplicationContext, CoreInfoService} from "@node-boot/context";
import Prometheus from "prom-client";
import {ExpressActuatorAdapter} from "./ExpressActuatorAdapter";
import {GitService} from "../service/GitService";
import {MetricsContext} from "../types";
import {MetadataService} from "../service/MetadataService";
import {FastifyActuatorAdapter} from "./FastifyActuatorAdapter";
import {ConfigService} from "@node-boot/config";
import {KoaActuatorAdapter} from "./KoaActuatorAdapter";

export class DefaultActuatorAdapter implements ActuatorAdapter {
    constructor(
        private readonly register = new Prometheus.Registry(),
        private readonly gitService: GitService = new GitService(),
    ) {}

    private setupMetrics(options: ActuatorOptions) {
        this.register.setDefaultLabels({
            app: options.appName,
        });
        Prometheus.collectDefaultMetrics({register: this.register});

        // https://squaredup.com/blog/instrument-node-with-prometheus/
        const http_request_counter = new Prometheus.Counter({
            name: "app_http_request_count",
            help: "Count of HTTP requests received by the app",
            labelNames: ["method", "route", "statusCode"],
        });
        this.register.registerMetric(http_request_counter);

        const http_request_duration_milliseconds = new Prometheus.Histogram({
            name: "app_http_request_duration_milliseconds",
            help: "Duration of HTTP requests in milliseconds.",
            labelNames: ["method", "route", "code"],
            buckets: [1, 2, 3, 4, 5, 10, 25, 50, 100, 250, 500, 1000],
        });
        this.register.registerMetric(http_request_duration_milliseconds);

        const context: MetricsContext = {
            register: this.register,
            http_request_duration_milliseconds,
            http_request_counter,
        };
        return context;
    }

    bind(options: ActuatorOptions, server: any, router: any): void {
        const context = this.setupMetrics(options);
        const metadataService = new MetadataService();

        const iocContainer = ApplicationContext.get().diOptions?.iocContainer;
        if (!iocContainer) {
            throw new Error(
                `IOC Container is required for Actuator module. Please @EnableDI(Container) in your Application class.`,
            );
        }
        const configService = iocContainer.get(ConfigService);
        const infoService = iocContainer.get(CoreInfoService);

        let frameworkAdapter: ActuatorAdapter;
        switch (options.serverType) {
            case "express":
                frameworkAdapter = new ExpressActuatorAdapter(
                    context,
                    this.gitService,
                    metadataService,
                    configService,
                    infoService,
                );
                break;
            case "koa":
                frameworkAdapter = new KoaActuatorAdapter(
                    context,
                    this.gitService,
                    metadataService,
                    configService,
                    infoService,
                );
                break;
            case "fastify":
                frameworkAdapter = new FastifyActuatorAdapter(
                    context,
                    this.gitService,
                    metadataService,
                    configService,
                    infoService,
                );
                break;
            default:
                throw new Error(
                    "Actuator feature is only allowed for express, koa and fastify servers. " +
                        "Please remove @EnableActuator from your application",
                );
        }
        frameworkAdapter.bind(options, server, router);
    }
}
