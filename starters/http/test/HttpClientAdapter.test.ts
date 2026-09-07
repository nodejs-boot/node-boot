import {describe, it, beforeEach, afterEach, mock} from "node:test";
import assert from "node:assert/strict";

import {ApplicationContext, Profile} from "@nodeboot/context";
import {HttpError} from "@nodeboot/error";
import {HttpClientAdapter} from "../src/adapter";
import {HTTP_CLIENT_FEATURE} from "../src";

function makeLogger() {
    return {
        error: mock.fn(),
        warn: mock.fn(),
        info: mock.fn(),
        debug: mock.fn(),
        child: mock.fn(),
    };
}

function makeIocContainer() {
    return {get: mock.fn(), set: mock.fn(), has: mock.fn(), reset: mock.fn()};
}

function registeredClient(iocContainer: ReturnType<typeof makeIocContainer>): any {
    const call = iocContainer.set.mock.calls[0];
    assert.ok(call);
    return call.arguments[1];
}

describe("HttpClientAdapter", () => {
    let originalFeatureFlag: boolean | undefined;
    let originalActiveProfiles: string | undefined;

    beforeEach(() => {
        originalFeatureFlag = ApplicationContext.get().applicationFeatures[HTTP_CLIENT_FEATURE];
        originalActiveProfiles = process.env["NODE_BOOT_ACTIVE_PROFILES"];
    });

    afterEach(() => {
        ApplicationContext.get().applicationFeatures[HTTP_CLIENT_FEATURE] = originalFeatureFlag;
        if (originalActiveProfiles === undefined) {
            delete process.env["NODE_BOOT_ACTIVE_PROFILES"];
        } else {
            process.env["NODE_BOOT_ACTIVE_PROFILES"] = originalActiveProfiles;
        }
    });

    it("does not register a client when the HTTP client feature is disabled", () => {
        delete ApplicationContext.get().applicationFeatures[HTTP_CLIENT_FEATURE];

        class MyClient {}
        const logger = makeLogger();
        const iocContainer = makeIocContainer();
        const adapter = new HttpClientAdapter(MyClient, {baseURL: "https://example.com"});

        adapter.bind({logger: logger as any, iocContainer: iocContainer as any, config: {} as any});

        assert.equal(logger.warn.mock.callCount(), 1);
        assert.equal(iocContainer.set.mock.callCount(), 0);
    });

    it("does not register a client when the current active profiles do not allow it", () => {
        ApplicationContext.get().applicationFeatures[HTTP_CLIENT_FEATURE] = true;
        process.env["NODE_BOOT_ACTIVE_PROFILES"] = "production";

        @Profile(["development"])
        class MyClient {}
        const logger = makeLogger();
        const iocContainer = makeIocContainer();
        const adapter = new HttpClientAdapter(MyClient, {baseURL: "https://example.com"});

        adapter.bind({logger: logger as any, iocContainer: iocContainer as any, config: {} as any});

        assert.equal(logger.warn.mock.callCount(), 1);
        assert.equal(iocContainer.set.mock.callCount(), 0);
    });

    it("registers an axios client under the target class using the provided config object", () => {
        ApplicationContext.get().applicationFeatures[HTTP_CLIENT_FEATURE] = true;

        class MyClient {}
        const logger = makeLogger();
        const iocContainer = makeIocContainer();
        const adapter = new HttpClientAdapter(MyClient, {baseURL: "https://example.com", timeout: 5000});

        adapter.bind({logger: logger as any, iocContainer: iocContainer as any, config: {} as any});

        assert.equal(iocContainer.set.mock.callCount(), 1);
        const client = registeredClient(iocContainer);
        const targetClass = iocContainer.set.mock.calls[0]!.arguments[0];
        assert.equal(targetClass, MyClient);
        assert.equal(client.defaults.baseURL, "https://example.com");
        assert.equal(client.defaults.timeout, 5000);
    });

    it("resolves a string config via the placeholder key and registers the client", () => {
        ApplicationContext.get().applicationFeatures[HTTP_CLIENT_FEATURE] = true;

        class MyClient {}
        const resolvedConfig = {baseURL: "https://resolved.example.com"};
        const config = {get: mock.fn(() => resolvedConfig)} as any;
        const iocContainer = makeIocContainer();
        const adapter = new HttpClientAdapter(MyClient, "${integrations.http.sampleapi}");

        adapter.bind({logger: makeLogger() as any, iocContainer: iocContainer as any, config});

        assert.equal(config.get.mock.callCount(), 1);
        assert.equal(config.get.mock.calls[0]!.arguments[0], "integrations.http.sampleapi");
        const client = registeredClient(iocContainer);
        assert.equal(client.defaults.baseURL, "https://resolved.example.com");
    });

    it("throws when a string config placeholder does not resolve to a configuration object", () => {
        ApplicationContext.get().applicationFeatures[HTTP_CLIENT_FEATURE] = true;

        class MyClient {}
        const config = {get: mock.fn(() => undefined)} as any;
        const iocContainer = makeIocContainer();
        const adapter = new HttpClientAdapter(MyClient, "${integrations.http.missing}");

        assert.throws(
            () => adapter.bind({logger: makeLogger() as any, iocContainer: iocContainer as any, config}),
            /No http configuration object found/,
        );
    });

    it("applies rate limiting when pluginConfigs.rateLimit is provided", () => {
        ApplicationContext.get().applicationFeatures[HTTP_CLIENT_FEATURE] = true;

        class MyClient {}
        const iocContainer = makeIocContainer();
        const adapter = new HttpClientAdapter(
            MyClient,
            {baseURL: "https://example.com"},
            {rateLimit: {maxRequests: 5, perMilliseconds: 1000}},
        );

        adapter.bind({logger: makeLogger() as any, iocContainer: iocContainer as any, config: {} as any});

        const client = registeredClient(iocContainer);
        assert.equal(typeof client.getMaxRPS, "function");
        assert.equal(client.getMaxRPS(), 5);
    });

    describe("error handling interceptor", () => {
        it("passes successful responses through unchanged", () => {
            ApplicationContext.get().applicationFeatures[HTTP_CLIENT_FEATURE] = true;

            class MyClient {}
            const iocContainer = makeIocContainer();
            const adapter = new HttpClientAdapter(MyClient, {baseURL: "https://example.com"});
            adapter.bind({logger: makeLogger() as any, iocContainer: iocContainer as any, config: {} as any});

            const client = registeredClient(iocContainer);
            const errorInterceptor = client.interceptors.response.handlers[0];
            const response = {status: 200, data: {}};

            assert.equal(errorInterceptor.fulfilled(response), response);
        });

        it("maps an error response into an HttpError using the response status and message", async () => {
            ApplicationContext.get().applicationFeatures[HTTP_CLIENT_FEATURE] = true;

            class MyClient {}
            const iocContainer = makeIocContainer();
            const adapter = new HttpClientAdapter(MyClient, {baseURL: "https://example.com"});
            adapter.bind({logger: makeLogger() as any, iocContainer: iocContainer as any, config: {} as any});

            const client = registeredClient(iocContainer);
            const errorInterceptor = client.interceptors.response.handlers[0];
            const axiosError = {response: {status: 404, data: {message: "Not Found"}}, config: {url: "/missing"}};

            await assert.rejects(
                () => errorInterceptor.rejected(axiosError),
                (error: any) => {
                    assert.ok(error instanceof HttpError);
                    assert.equal(error.httpCode, 404);
                    assert.equal(error.message, "Not Found");
                    return true;
                },
            );
        });

        it("maps a network error (no response) into a 500 HttpError", async () => {
            ApplicationContext.get().applicationFeatures[HTTP_CLIENT_FEATURE] = true;

            class MyClient {}
            const iocContainer = makeIocContainer();
            const adapter = new HttpClientAdapter(MyClient, {baseURL: "https://example.com"});
            adapter.bind({logger: makeLogger() as any, iocContainer: iocContainer as any, config: {} as any});

            const client = registeredClient(iocContainer);
            const errorInterceptor = client.interceptors.response.handlers[0];
            const networkError = {message: "Network Error"};

            await assert.rejects(
                () => errorInterceptor.rejected(networkError),
                (error: any) => {
                    assert.ok(error instanceof HttpError);
                    assert.equal(error.httpCode, 500);
                    assert.equal(error.message, "Network Error");
                    return true;
                },
            );
        });
    });

    describe("httpLogging", () => {
        it("does not add request/response logging interceptors when httpLogging is not enabled", () => {
            ApplicationContext.get().applicationFeatures[HTTP_CLIENT_FEATURE] = true;

            class MyClient {}
            const iocContainer = makeIocContainer();
            const adapter = new HttpClientAdapter(MyClient, {baseURL: "https://example.com"});
            adapter.bind({logger: makeLogger() as any, iocContainer: iocContainer as any, config: {} as any});

            const client = registeredClient(iocContainer);
            assert.equal(client.interceptors.request.handlers.length, 0);
            // Only the always-on error handling interceptor should be present.
            assert.equal(client.interceptors.response.handlers.length, 1);
        });

        it("logs outgoing requests and incoming responses when httpLogging is enabled", () => {
            ApplicationContext.get().applicationFeatures[HTTP_CLIENT_FEATURE] = true;

            class MyClient {}
            const logger = makeLogger();
            const iocContainer = makeIocContainer();
            const adapter = new HttpClientAdapter(MyClient, {baseURL: "https://example.com", httpLogging: true});
            adapter.bind({logger: logger as any, iocContainer: iocContainer as any, config: {} as any});

            assert.equal(logger.info.mock.callCount(), 2); // registering + httpLogging enabled messages

            const client = registeredClient(iocContainer);
            const requestInterceptor = client.interceptors.request.handlers[0];
            const fakeRequest = {baseURL: "https://example.com", method: "get", url: "/users"};
            assert.equal(requestInterceptor.fulfilled(fakeRequest), fakeRequest);
            assert.equal(logger.debug.mock.callCount(), 1);

            const responseInterceptor = client.interceptors.response.handlers[1];
            const fakeResponse = {status: 200, config: {url: "/users"}};
            assert.equal(responseInterceptor.fulfilled(fakeResponse), fakeResponse);
            assert.equal(logger.debug.mock.callCount(), 2);
        });

        it("logs response errors without swallowing them", async () => {
            ApplicationContext.get().applicationFeatures[HTTP_CLIENT_FEATURE] = true;

            class MyClient {}
            const logger = makeLogger();
            const iocContainer = makeIocContainer();
            const adapter = new HttpClientAdapter(MyClient, {baseURL: "https://example.com", httpLogging: true});
            adapter.bind({logger: logger as any, iocContainer: iocContainer as any, config: {} as any});

            const client = registeredClient(iocContainer);
            const responseInterceptor = client.interceptors.response.handlers[1];
            const errorWithResponse = {
                response: {status: 500, data: "boom"},
                config: {url: "/users"},
            };

            await assert.rejects(() => responseInterceptor.rejected(errorWithResponse));
            assert.equal(logger.error.mock.callCount(), 1);
        });
    });
});
