import axios, {AxiosInstance} from "axios";
import {
    ApplicationContext,
    ApplicationFeatureAdapter,
    ApplicationFeatureContext,
    extractPlaceholderKey,
    Lifecycle,
    LoggerService,
} from "@nodeboot/context";
import {HTTP_CLIENT_FEATURE, HttpClientConfig, HttpClientStub, PluginConfigs} from "../client";
import {HttpError} from "@nodeboot/error";
import axiosRateLimit from "axios-rate-limit";

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
     * @param {PluginConfigs} [pluginConfigs] - Optional plugin configurations for the HTTP client.
     */
    constructor(
        private readonly targetClass: new (...args: any[]) => any,
        private clientConfig: HttpClientConfig | string,
        private pluginConfigs?: PluginConfigs,
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
            this.clientConfig = this.getHttpConfig(config);

            logger.info(
                `🌐 Registering HTTP client "${this.targetClass.name}" for target API ${this.clientConfig.baseURL}`,
            );

            // Create and register the HTTP client
            let httpClient = axios.create(this.clientConfig);
            // If plugin configurations are provided, set up plugins
            httpClient = this.setupPlugins(httpClient, logger);

            // Set up error handling for the HTTP client
            this.setupErrorHandling(httpClient);

            // If httpLogging is enabled, set up logging for requests and responses
            if (this.clientConfig.httpLogging) {
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

    private setupPlugins(httpClient: AxiosInstance, logger: LoggerService) {
        if (this.pluginConfigs) {
            // Apply rate limiting if configured
            if (this.pluginConfigs.rateLimit) {
                logger.info(`Applying rate limit configuration to HTTP client ${this.targetClass.name}`);
                httpClient = axiosRateLimit(httpClient, this.pluginConfigs.rateLimit);
            }
        }
        return httpClient;
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
        instance.interceptors.request.use(
            request => {
                logger.debug(
                    `<== Outgoing Request: ${request.baseURL}/${request.method?.toUpperCase()} ${request.url}`,
                );
                return request;
            },
            error => {
                console.error("Axios Request Error:", error);
                return Promise.reject(error);
            },
        );

        instance.interceptors.response.use(
            response => {
                logger.debug(
                    `==> Incoming Response: ${response.status} ${(this.clientConfig as HttpClientConfig).baseURL}/${
                        response.config.url
                    }`,
                );
                return response;
            },
            error => {
                if (error.response) {
                    logger.error("HTTP Response Error:", {
                        status: error.response.status,
                        url: error.config.url,
                        data: error.response.data,
                    });
                } else {
                    logger.error("HTTP Network Error:", error.message);
                }
                return Promise.reject(error);
            },
        );
    }

    private setupErrorHandling(instance: HttpClientStub) {
        instance.interceptors.response.use(
            response => response, // pass successful responses through
            (error: any) => {
                const status = error.response?.status ?? 500;
                const message =
                    error.response?.data?.message ||
                    error.message ||
                    "Unexpected error occurred while making HTTP request";

                // You can also log here or report to a monitoring system
                return Promise.reject(new HttpError(status, message));
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
            return config.get(configPath) as HttpClientConfig;
        }
        return undefined;
    }
}
