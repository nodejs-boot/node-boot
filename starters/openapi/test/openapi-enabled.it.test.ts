/**
 * Auto-configuration integration test for `@nodeboot/starter-openapi`.
 *
 * Unlike the DI-only starters tested elsewhere, this needs a real HTTP server
 * (`@nodeboot/http-server`) since the whole point of `@EnableOpenApi()` is serving a generated
 * spec over an actual route.
 */
import {before, describe, test} from "node:test";
import assert from "node:assert/strict";
import {useNodeBoot} from "@nodeboot/node-test";
import {OpenApiEnabledApp} from "./fixtures/OpenApiEnabledApp";

describe("@nodeboot/starter-openapi auto-configuration - @EnableOpenApi() applied", () => {
    // `@nodeboot/node-test` resolves `NodeBootApp` against its own (published) `@nodeboot/core`
    // dependency, which TypeScript treats as nominally distinct from this monorepo's workspace
    // package of the same name - cast at the boundary rather than relaxing the fixture's typing.
    const {useHttp} = useNodeBoot(OpenApiEnabledApp as any, ({useConfig}) => {
        useConfig({app: {name: "starter-openapi-enabled-test"}});
    });

    let http: ReturnType<typeof useHttp>;

    before(() => {
        http = useHttp();
        http.defaults.validateStatus = () => true;
    });

    test("serves a generated OpenAPI spec at /api-docs/swagger.json that documents the real controller", async () => {
        const response = await http.get("/api-docs/swagger.json");

        assert.equal(response.status, 200);
        assert.equal(response.data.openapi?.startsWith("3."), true);
        assert.ok(response.data.paths["/hello/{id}"], `expected '/hello/{id}' among documented paths`);
        assert.ok(response.data.paths["/hello/{id}"].get, "expected a documented GET operation");
    });
});
