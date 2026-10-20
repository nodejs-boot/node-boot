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
import {useNodeBoot} from "@nodeboot/node-test";
import {HttpClientDisabledApp} from "./fixtures/HttpClientDisabledApp";
import {DisabledHttpClient} from "./fixtures/DisabledHttpClient";
import {ApplicationContext} from "@nodeboot/context";

describe("@nodeboot/starter-http auto-configuration - no @EnableHttpClients() applied", () => {
    useNodeBoot(HttpClientDisabledApp as any, ({useConfig}) => {
        useConfig({app: {name: "starter-http-disabled-test"}});
    });

    test("never binds a client for the @HttpClient-decorated class in the IoC container", () => {
        // `@HttpClient` registers its class as a late-bound token (so classes injecting it pass
        // graph validation), which makes `.has()` true even when nothing ever binds a real
        // client. With the feature disabled, the placeholder must stay unresolved.
        assert.throws(() => ApplicationContext.getIocContainer()!.get(DisabledHttpClient), /not available yet/);
    });
});
