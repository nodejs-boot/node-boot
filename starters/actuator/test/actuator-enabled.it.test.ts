/**
 * Auto-configuration integration test for `@nodeboot/starter-actuator` with Native HTTP server adapter.
 *
 * Unlike the DI-only starters tested elsewhere, this needs a real HTTP server
 * (`@nodeboot/http-server`) since the whole point of `@EnableActuator()` is exposing health/info/
 * metrics endpoints over actual routes.
 */
import {before, describe, test} from "node:test";
import assert from "node:assert/strict";
import {hostname} from "node:os";
import {useNodeBoot} from "@nodeboot/node-test";
import {ActuatorEnabledApp} from "./fixtures/ActuatorEnabledApp";

const TEST_PORT = 38101;

describe("@nodeboot/starter-actuator - Native HTTP server adapter", () => {
    // `@nodeboot/node-test` resolves `NodeBootApp` against its own (published) `@nodeboot/core`
    // dependency, which TypeScript treats as nominally distinct from this monorepo's workspace
    // package of the same name - cast at the boundary rather than relaxing the fixture's typing.
    const {useHttp} = useNodeBoot(ActuatorEnabledApp as any, ({useConfig}) => {
        useConfig({
            app: {name: "starter-actuator-enabled-test", port: TEST_PORT},
            custom: {mode: "native-http"},
        });
    });

    let http: ReturnType<typeof useHttp>;

    before(() => {
        http = useHttp();
        http.defaults.validateStatus = () => true;
    });

    test("exposes /actuator with available endpoints list", async () => {
        const response = await http.get("/actuator");

        assert.equal(response.status, 200);
        assert.equal(response.data.context, "Available actuator endpoints");
        assert.ok(Array.isArray(response.data.endpoints));
        assert.ok(response.data.endpoints.includes("/actuator/health"));
        assert.ok(response.data.endpoints.includes("/actuator/info"));
        assert.ok(response.data.endpoints.includes("/actuator/prometheus"));
    });

    test("exposes /actuator/health with readiness and liveness sections", async () => {
        const response = await http.get("/actuator/health");

        assert.equal(response.status, 200);
        assert.equal(response.data.readinessPath, "/actuator/health/readiness");
        assert.equal(response.data.livenessPath, "/actuator/health/liveness");
        assert.ok(response.data.readiness);
        assert.ok(response.data.liveness);
    });

    test("exposes /actuator/health/readiness", async () => {
        const response = await http.get("/actuator/health/readiness");

        assert.equal(response.status, 200);
        assert.ok(response.data);
    });

    test("exposes /actuator/health/liveness", async () => {
        const response = await http.get("/actuator/health/liveness");

        assert.equal(response.status, 200);
        assert.ok(response.data);
    });

    test("exposes /actuator/info with real process/runtime metadata", async () => {
        const response = await http.get("/actuator/info");

        assert.equal(response.status, 200);
        assert.equal(response.data.nodeVersion, process.versions.node);
        assert.equal(response.data.host, hostname());
        assert.ok(Array.isArray(response.data.activeProfiles));
    });

    test("exposes /actuator/git endpoint", async () => {
        const response = await http.get("/actuator/git");

        assert.equal(response.status, 200);
    });

    test("exposes /actuator/config with application config", async () => {
        const response = await http.get("/actuator/config");

        assert.equal(response.status, 200);
        assert.ok(typeof response.data === "object");
        assert.equal(response.data.app?.name, "starter-actuator-enabled-test");
        assert.equal(response.data.custom?.mode, "native-http");
    });

    test("exposes /actuator/memory with process memory usage", async () => {
        const response = await http.get("/actuator/memory");

        assert.equal(response.status, 200);
        assert.ok(response.data);
        assert.equal(typeof response.data.totalMem, "number");
        assert.equal(typeof response.data.freeMem, "number");
        assert.equal(typeof response.data.memoryUsage?.rss, "number");
        assert.equal(typeof response.data.memoryUsage?.heapTotal, "number");
        assert.equal(typeof response.data.memoryUsage?.heapUsed, "number");
    });

    test("exposes /actuator/metrics with Prometheus metrics as JSON", async () => {
        const response = await http.get("/actuator/metrics");

        assert.equal(response.status, 200);
        assert.ok(Array.isArray(response.data));
        const metricNames = response.data.map((m: any) => m.name);
        assert.ok(metricNames.includes("app_http_request_count"));
        assert.ok(metricNames.includes("app_http_request_duration_milliseconds"));
    });

    test("exposes /actuator/prometheus with real Prometheus-formatted metrics", async () => {
        const response = await http.get("/actuator/prometheus");

        assert.equal(response.status, 200);
        assert.equal(typeof response.data, "string");
        assert.ok(response.data.includes("# HELP"), "expected Prometheus exposition format");
        assert.ok(response.data.includes("app_http_request_count"));
    });

    test("exposes /actuator/controllers", async () => {
        const response = await http.get("/actuator/controllers");

        assert.equal(response.status, 200);
        assert.ok(Array.isArray(response.data));
    });

    test("exposes /actuator/interceptors", async () => {
        const response = await http.get("/actuator/interceptors");

        assert.equal(response.status, 200);
        assert.ok(Array.isArray(response.data));
    });

    test("exposes /actuator/middlewares", async () => {
        const response = await http.get("/actuator/middlewares");

        assert.equal(response.status, 200);
        assert.ok(Array.isArray(response.data));
    });
});
