import {AxiosRequestConfig} from "axios";
import {rateLimitOptions} from "axios-rate-limit";

export const HTTP_CLIENT_FEATURE = Symbol("HTTP-Client-Feature");

/**
 * Configuration options for an HTTP client in the NodeBoot framework.
 *
 * This interface extends the standard Axios request configuration, allowing additional
 * options specific to the NodeBoot framework, such as HTTP logging.
 *
 * ## Properties
 * - **baseURL** (`string`) – The base URL for HTTP requests.
 * - **timeout** (`number`) – The request timeout in milliseconds.
 * - **headers** (`Record<string, string>`) – Default headers to include in requests.
 * - **params** (`Record<string, any>`) – Default query parameters for requests.
 * - **httpLogging** (`boolean`) – Enables or disables HTTP request/response logging (default: `true`).
 *
 * ## Usage Example
 * ```typescript
 * import { HttpClient, HttpClientStub, HttpClientConfig } from "@nodeboot/starter-http";
 *
 * const config: HttpClientConfig = {
 *     baseURL: "https://jsonplaceholder.typicode.com",
 *     timeout: 5000,
 *     httpLogging: true,
 * };
 *
 * @HttpClient(config)
 * export class MicroserviceHttpClient extends HttpClientStub {}
 * ```
 */
export interface HttpClientConfig extends AxiosRequestConfig {
    /**
     * Enables or disables logging of HTTP requests and responses.
     * Default is `true`.
     */
    httpLogging?: boolean;
}

/**
 * Plugin configuration options for the HTTP client feature in the NodeBoot framework.
 *
 * This type allows for optional configuration of rate limiting for HTTP requests.
 *
 * ## Properties
 * - **rateLimit** (`rateLimitOptions`) – Configuration options for rate limiting HTTP requests.
 *
 * ## Usage Example
 * ```typescript
 * import { PluginConfigs } from "@nodeboot/starter-http";
 *
 * const pluginConfig: PluginConfigs = {
 *     rateLimit: {
 *         maxRequests: 100,
 *         perMilliseconds: 60000,
 *     },
 * };
 * ```
 */
export type PluginConfigs = {
    rateLimit?: rateLimitOptions;
};
