import {HttpClient, HttpClientStub} from "../../src";

/**
 * Decorated with `@HttpClient(...)` exactly like `EnabledHttpClient` - the only difference this
 * fixture is meant to isolate is that its app never applies `@EnableHttpClients()`. That decorator
 * still runs at class-definition time regardless (it just pushes an `HttpClientAdapter` that will
 * find the feature disabled once it actually tries to bind).
 */
@HttpClient({baseURL: "http://127.0.0.1:1"})
export class DisabledHttpClient extends HttpClientStub {}
