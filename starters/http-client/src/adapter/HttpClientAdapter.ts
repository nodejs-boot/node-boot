import axios from "axios";
import {
    ApplicationContext,
    ApplicationFeatureAdapter,
    ApplicationFeatureContext,
    LoggerService,
} from "@nodeboot/context";
import {HTTP_CLIENT_FEATURE, HttpClientConfig, HttpClientStub} from "../client";

export class HttpClientAdapter implements ApplicationFeatureAdapter {
    constructor(
        private readonly targetClass: new (...args: any[]) => any,
        private readonly clientConfig: HttpClientConfig,
    ) {}

    bind({logger, iocContainer}: ApplicationFeatureContext): void {
        // Check if HTTP feature is enabled
        if (ApplicationContext.get().applicationFeatures[HTTP_CLIENT_FEATURE]) {
            // Register HTTP method using Axios
            logger.info(
                `🌐 Registering HTTP client "${this.targetClass.name}" for target API ${this.clientConfig.baseURL}`,
            );

            const httpClient = axios.create(this.clientConfig);
            if (this.clientConfig.httpLogging) {
                logger.info(`HTTP logging is enabled for client ${this.targetClass.name}`);
                this.setupHttpLogging(httpClient, logger);
            }
            iocContainer.set(this.targetClass, httpClient);
        } else {
            logger.warn(
                `🌐 HTTP client is disabled. Please enable HTTP client feature by decoration your application class with @EnableHttpClients()`,
            );
        }
    }

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
}
