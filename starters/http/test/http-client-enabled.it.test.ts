/**
 * Auto-configuration integration test for `@nodeboot/starter-http` - positive case.
 *
 * The unit tests elsewhere in this package (`EnableHttpClients.test.ts`, `HttpClient.test.ts`,
 * `HttpClientAdapter.test.ts`) exercise the starter's internal pieces directly, with mocked
 * `logger`/`iocContainer`/`config`. None of them prove the starter actually autowires into a
 * *running* Node-Boot application: that `@EnableHttpClients()` plus `@HttpClient(...)` results in
 * a real, working axios instance sitting in the DI container, wired to the configured `baseURL`,
 * with the starter's error-handling interceptor active.
 *
 * `@nodeboot/node-test` has no dedicated "mock outbound HTTP response" hook to reach for here -
 * `useHttp()`/`HttpClientHook` only drive the app's own *inbound* endpoints (there are none in
 * this fixture; it's DI-only, no HTTP transport), and `useMock()`/`MockHook` cannot reach this
 * workspace's real running app's IoC container (see the `Container.get()` note below - the same
 * limitation `nodeboot-test-framework` documents for `useService()`). So this spins up a small
 * real local HTTP server (`./fixtures/downstreamServer.ts`) to stand in for the downstream
 * service, and drives the registered client at it directly.
 *
 * See `http-client-disabled.it.test.ts` for the negative counterpart. Kept in a separate file/app
 * boot because `@nodeboot/node-test` does not support booting more than one `useNodeBoot()` app
 * per file.
 */
import {after, before, describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {useNodeBoot} from "@nodeboot/node-test";
import {HttpError} from "@nodeboot/error";
import {HttpClientEnabledApp} from "./fixtures/HttpClientEnabledApp";
import {EnabledHttpClient} from "./fixtures/EnabledHttpClient";
import {startDownstreamServer} from "./fixtures/downstreamServer";

const DOWNSTREAM_PORT = 34970;
const downstreamServer = startDownstreamServer(DOWNSTREAM_PORT);

describe("@nodeboot/starter-http auto-configuration - @EnableHttpClients() applied", () => {
    // `@nodeboot/node-test` resolves `NodeBootApp` against its own (published) `@nodeboot/core`
    // dependency, which TypeScript treats as nominally distinct from this monorepo's workspace
    // package of the same name - cast at the boundary rather than relaxing the fixture's typing.
    useNodeBoot(HttpClientEnabledApp as any, ({useConfig}) => {
        useConfig({
            app: {name: "starter-http-enabled-test"},
            integrations: {http: {testapi: {baseURL: `http://127.0.0.1:${DOWNSTREAM_PORT}`}}},
        });
    });

    before(
        () =>
            new Promise<void>(resolve =>
                downstreamServer.listening ? resolve() : downstreamServer.once("listening", resolve),
            ),
    );
    after(() => new Promise<void>(resolve => downstreamServer.close(() => resolve())));

    test("registers a working axios client in the IoC container, configured with the resolved baseURL", async () => {
        // `@nodeboot/node-test`'s own `useService()` resolves against a different (published)
        // `ApplicationContext` singleton than this workspace's real running app - see
        // `nodeboot-test-framework`. Retrieve straight from `typedi`'s Container, the one
        // `@EnableDI(Container)` actually wired the client's resolved axios instance into.
        const client = Container.get(EnabledHttpClient);

        assert.equal(client.defaults.baseURL, `http://127.0.0.1:${DOWNSTREAM_PORT}`);

        const response = await client.get("/users/1");
        assert.equal(response.status, 200);
        assert.deepEqual(response.data, {id: 1, name: "Jane"});
    });

    test("maps a downstream error response into an HttpError via the starter's interceptor", async () => {
        const client = Container.get(EnabledHttpClient);

        await assert.rejects(
            () => client.get("/boom"),
            (error: any) => {
                assert.ok(error instanceof HttpError);
                assert.equal(error.httpCode, 500);
                return true;
            },
        );
    });
});
