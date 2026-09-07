import {HttpClient, HttpClientStub} from "../../src";

/**
 * Uses the config-placeholder form (rather than a literal `HttpClientConfig` object) so the
 * `baseURL` is resolved at `bind()` time from whatever `integrations.http.testapi` the test's
 * `useConfig()` supplies - letting the test point this at a downstream port only known at runtime.
 */
@HttpClient("${integrations.http.testapi}")
export class EnabledHttpClient extends HttpClientStub {}
