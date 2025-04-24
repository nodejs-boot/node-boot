import axios from "axios";
import {
    ApplicationContext,
    ApplicationFeatureAdapter,
    ApplicationFeatureContext,
    extractPlaceholderKey,
    Lifecycle,
    LoggerService,
} from "@nodeboot/context";
import {HTTP_CLIENT_FEATURE, HttpClientConfig, HttpClientStub} from "../client";

/**
 * The adapter responsible for integrating HTTP clients into the NodeBoot application lifecycle.
 *
 * This adapter:
 * - Checks if the HTTP client feature is enabled in the application.
 * - Creates and registers an Axios-based HTTP client instance.
 * - Enables HTTP logging if configured.
 * - Provides the HTTP client instance to the Dependency Injection (DI) container for injection into services.
 *
 * ## How It Works
 * 1. When an HTTP client class is decorated with `@HttpClient()`, this adapter is instantiated.
 * 2. It registers the HTTP client instance in the DI container so it can be injected into services.
 * 3. If `httpLogging` is enabled, it sets up logging for outgoing requests and incoming responses.
 *
 * ## Usage
 * Users should apply `@EnableHttpClients()` to their application and use `@HttpClient()` to register clients.
 *
 * @example
 * ```typescript
 * import { EnableHttpClients } from "@nodeboot/starter-http";
 * import { EnableDI } from "@nodeboot/di";
 * import { EnableComponentScan } from "@nodeboot/scan";
 * import { NodeBootApplication, NodeBoot, NodeBootApp, NodeBootAppView } from "@nodeboot/core";
 * import { ExpressServer } from "@nodeboot/express-server";
 * import { Container } from "typedi";
 *
 * @EnableDI(Container)
 * @EnableHttpClients()
 * @EnableComponentScan()
 * @NodeBootApplication()
 * export class SampleBackendApp implements NodeBootApp {
 *     start(): Promise<NodeBootAppView> {
 *         return NodeBoot.run(ExpressServer);
 *     }
 * }
 * ```
 *
 * @implements {ApplicationFeatureAdapter}
 */
@Lifecycle("application.started")
export class HttpClientAdapter implements ApplicationFeatureAdapter {
    /**
     * Creates an instance of `HttpClientAdapter`.
     *
     * @param {new (...args: any[]) => any} targetClass - The class marked as an HTTP client.
     * @param {HttpClientConfig | string} clientConfig - Configuration settings for the HTTP client.
     */
    constructor(
        private readonly targetClass: new (...args: any[]) => any,
        private readonly clientConfig: HttpClientConfig | string,
    ) {}

    /**
     * Binds the HTTP client to the NodeBoot application lifecycle.
     *
     * - Checks if HTTP clients are enabled (`@EnableHttpClients()` must be applied).
     * - Registers the HTTP client instance in the DI container.
     * - Configures HTTP request/response logging if enabled.
     *
     * @param {ApplicationFeatureContext} context - The application context providing a logger and DI container.
     */
    bind({logger, iocContainer, config}: ApplicationFeatureContext): void {
        // Check if HTTP feature is enabled
        if (ApplicationContext.get().applicationFeatures[HTTP_CLIENT_FEATURE]) {
            const httpClientConfig = this.getHttpConfig(config);

            logger.info(
                `🌐 Registering HTTP client "${this.targetClass.name}" for target API ${httpClientConfig.baseURL}`,
            );

            // Create and register the HTTP client
            const httpClient = axios.create(httpClientConfig);
            if (httpClientConfig.httpLogging) {
                logger.info(`HTTP logging is enabled for client ${this.targetClass.name}`);
                this.setupHttpLogging(httpClient, logger);
            }

            // Provide the client instance to the DI container
            iocContainer.set(this.targetClass, httpClient);
        } else {
            logger.warn(
                `🌐 HTTP client is disabled. Please enable HTTP client feature by decorating your application class with @EnableHttpClients()`,
            );
        }
    }

    /**
     * Sets up HTTP request and response logging if `httpLogging` is enabled.
     *
     * Logs outgoing requests and incoming responses, and captures errors.
     *
     * @param {HttpClientStub} instance - The Axios HTTP client instance.
     * @param {LoggerService} logger - The application's logging service.
     * @private
     */
    private setupHttpLogging(instance: HttpClientStub, logger: LoggerService) {
        instance.interceptors.request.use(request => {
            logger.debug(`<== Outgoing Request: ${request.method?.toUpperCase()} ${request.url}`);
            return request;
        });

        instance.interceptors.response.use(
            response => {
                logger.debug(`==> Incoming Response: ${response.status} ${response.config.url}`);
                return response;
            },
            error => {
                logger.error(`Error: ${error.message}`);
                return Promise.reject(error);
            },
        );
    }

    private getHttpConfig(config: any) {
        if (typeof this.clientConfig === "string") {
            // resolve httpConfigs options from configurations
            const httpConfigs = this.resolveHttpConfig(config, this.clientConfig);
            if (!httpConfigs)
                throw new Error(`No http configuration object found by using ${this.clientConfig} placeholder`);
            return httpConfigs;
        } else {
            // use HttpClientConfig provided via decorator
            return this.clientConfig;
        }
    }

    private resolveHttpConfig(config: any, configPathPlaceholder: string): HttpClientConfig | undefined {
        const configPath = extractPlaceholderKey(configPathPlaceholder);
        if (configPath) {
            return config.getConfig(configPath) as HttpClientConfig;
        }
        return undefined;
    }
}
