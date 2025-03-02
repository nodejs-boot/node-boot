import {Axios} from "axios";

/**
 * A base class for HTTP clients in the NodeBoot framework.
 *
 * `HttpClientStub` extends `Axios`, allowing services to make HTTP requests
 * while integrating seamlessly with the NodeBoot framework. It is typically
 * used in combination with the `@HttpClient` decorator and injected into services.
 *
 * ## Usage
 * This class should be extended and decorated with `@HttpClient()`, then injected into services.
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
 * ```
 *
 * ### Injecting the HTTP Client into a Service
 * The decorated HTTP client can then be injected into a service using `@Service()`.
 *
 * ```typescript
 * import { Service } from "typedi";
 * import { Logger } from "@nodeboot/logger";
 * import { MicroserviceHttpClient } from "./MicroserviceHttpClient";
 *
 * @Service()
 * export class UserService {
 *     constructor(
 *         private readonly logger: Logger,
 *         private readonly httpClient: MicroserviceHttpClient,
 *     ) {}
 *
 *     public async findExternalUsers(): Promise<User[]> {
 *         this.logger.info("Getting users from external service");
 *         const result = await this.httpClient.get("/users");
 *         this.logger.info(`Found ${result.data.length} users by calling external API`);
 *         return result.data;
 *     }
 * }
 * ```
 *
 * @extends {Axios}
 */
export class HttpClientStub extends Axios {}
