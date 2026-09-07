/**
 * Auto-configuration integration test for `@nodeboot/starter-http` - negative case.
 *
 * Boots a real Node-Boot app (via `@nodeboot/node-test`'s `useNodeBoot`, on `GhostServer`) that
 * deliberately never applies `@EnableHttpClients()`, even though `DisabledHttpClient` still carries
 * `@HttpClient(...)` (isolating the one thing this test varies). Contrasted against
 * `http-client-enabled.it.test.ts`'s `HttpClientEnabledApp`. Kept in a separate file/app boot
 * because `@nodeboot/node-test` does not support booting more than one `useNodeBoot()` app per
 * file.
 */
import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {useNodeBoot} from "@nodeboot/node-test";
import {HttpClientDisabledApp} from "./fixtures/HttpClientDisabledApp";
import {DisabledHttpClient} from "./fixtures/DisabledHttpClient";

describe("@nodeboot/starter-http auto-configuration - no @EnableHttpClients() applied", () => {
    useNodeBoot(HttpClientDisabledApp as any, ({useConfig}) => {
        useConfig({app: {name: "starter-http-disabled-test"}});
    });

    test("never registers a client for the @HttpClient-decorated class in the IoC container", () => {
        // `typedi`'s own `.has()` reports registration without ever attempting to construct
        // anything, so this stays meaningful regardless of whether an unregistered `Axios`
        // subclass happens to be auto-constructible.
        assert.equal(Container.has(DisabledHttpClient), false);
    });
});
