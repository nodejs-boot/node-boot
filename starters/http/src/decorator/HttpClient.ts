import {HttpClientConfig} from "../client";
import {ApplicationContext} from "@nodeboot/context";
import {HttpClientAdapter} from "../adapter";

/**
 * A class decorator that marks a class as an HTTP client in the NodeBoot framework.
 *
 * This decorator registers the class as an HTTP client and allows passing configuration
 * options that extend the Axios request configuration, such as `baseURL`, `timeout`, and custom headers.
 *
 * ## Configuration Options
 * - `baseURL` (string) – Base URL for HTTP requests.
 * - `timeout` (number) – Request timeout in milliseconds.
 * - `headers` (object) – Default headers to include in requests.
 * - `httpLogging` (boolean) – Enables logging of HTTP requests and responses (default: `true`).
 *
 * ## Usage
 * Apply this decorator to a class that extends `HttpClientStub` to enable HTTP client capabilities.
 *
 * @example
 * ```typescript
 * import { HttpClient, HttpClientStub } from "@nodeboot/starter-http";
 *
 * @HttpClient({
 *     baseURL: "https://jsonplaceholder.typicode.com",
 *     timeout: 5000,
 *     httpLogging: true,
 * })
 * export class MicroserviceHttpClient extends HttpClientStub {}
 *
 *
 * @HttpClient(`${integrations.http.sampleapi}`)
 * export class ServiceHttpClient extends HttpClientStub {}
 * ```
 *
 * @param {HttpClientConfig | string} config - Configuration options for the HTTP client or config properties path
 * @returns {ClassDecorator} A decorator function that registers the class as an HTTP client.
 */
export function HttpClient(config: HttpClientConfig | string): ClassDecorator {
    return function (target: any) {
        const schedulerAdapter = new HttpClientAdapter(target, config);
        ApplicationContext.get().applicationFeatureAdapters.push(schedulerAdapter);
    };
}
