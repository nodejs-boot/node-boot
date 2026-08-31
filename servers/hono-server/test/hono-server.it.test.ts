/**
 * Integration tests for the `@nodeboot/hono-server` driver.
 *
 * Boots a real Node-Boot application on `HonoServer` (via `@nodeboot/node-test`'s `useNodeBoot`)
 * and drives it over real HTTP, covering the full request/response surface (routing, path/query
 * params, headers, cookies, body parsing + validation, authorization, and error handling) - including
 * regression coverage for two Hono-specific bugs found while building this adapter:
 *
 * 1. `c.json()`/`c.body()` only *build* a Response; the driver must assign it back to `c.res`
 *    (via `routeHandler`), otherwise Hono silently falls back to its own default response.
 * 2. Hono only resolves path params correctly from within the handler whose own route pattern
 *    matched; caching them from an earlier global-middleware layer leaks empty params downstream.
 */
import {before, describe, test} from "node:test";
import assert from "node:assert/strict";
import type {AxiosInstance} from "axios";
import {useNodeBoot} from "@nodeboot/node-test";
import {TestApp} from "./fixtures/TestApp";
import {requestLog} from "./fixtures/RequestLogMiddleware";

const TEST_PORT = 34599;

describe("Hono Server Adapter", () => {
    // `@nodeboot/node-test` resolves `NodeBootApp` against its own (published) `@nodeboot/core`
    // dependency, which TypeScript treats as nominally distinct from this monorepo's workspace
    // package of the same name - cast at the boundary rather than relaxing `TestApp`'s own typing.
    const {useHttp} = useNodeBoot(TestApp as any, ({useConfig}) => {
        useConfig({app: {name: "hono-server-test", port: TEST_PORT}});
    });

    let http: AxiosInstance;

    before(() => {
        http = useHttp();
        // Assert on status codes directly instead of catching AxiosErrors for every 4xx/5xx case.
        http.defaults.validateStatus = () => true;
    });

    describe("routing", () => {
        test('`@Get("/")` and `@Get()` on the same base path stay distinct routes', async () => {
            const withSlash = await http.get("/hello/");
            assert.equal(withSlash.status, 200);
            assert.equal(withSlash.data, "Hello, World!");

            const withoutSlash = await http.get("/hello");
            assert.equal(withoutSlash.status, 200);
            assert.deepEqual(withoutSlash.data, {message: "hello props"});
        });

        test("returns 404 for a route registered only with a trailing slash, requested without one", async () => {
            // `/hello/` is registered; Hono is strict, so `/hello/extra` style mismatches 404,
            // and so does requesting a genuinely unregistered path.
            const response = await http.get("/does-not-exist");
            assert.equal(response.status, 404);
        });

        test("honors @HttpCode overrides", async () => {
            const response = await http.get("/hello/created");
            assert.equal(response.status, 201);
            assert.deepEqual(response.data, {created: true});
        });

        test("returns an empty body with 204 for a null result", async () => {
            const response = await http.get("/hello/nothing");
            assert.equal(response.status, 204);
        });

        test("treats an undefined result as not-found", async () => {
            const response = await http.get("/hello/missing");
            assert.equal(response.status, 404);
            assert.equal(response.data.fromCustomHandler, true);
        });

        test("supports redirects", async () => {
            const response = await http.get("/hello/redirect", {maxRedirects: 0});
            assert.equal(response.status, 302);
            assert.equal(response.headers["location"], "/hello/");
        });
    });

    describe("request parameters", () => {
        test("resolves a path param on its own matched route, even after a global middleware ran first", async () => {
            const logCountBefore = requestLog.length;

            const response = await http.get("/items/42");

            assert.equal(response.status, 200);
            assert.deepEqual(response.data, {id: 42, type: "number"});
            // The global RequestLogMiddleware really did run ahead of the controller action.
            assert.ok(requestLog.length > logCountBefore);
            assert.ok(requestLog.at(-1)?.endsWith("/items/42"));
        });

        test("resolves query params", async () => {
            const response = await http.get("/items", {params: {q: "widgets"}});
            assert.equal(response.status, 200);
            assert.deepEqual(response.data, {q: "widgets"});
        });

        test("resolves header params", async () => {
            const response = await http.get("/items/echo/header", {
                headers: {"x-test-header": "hello-header"},
            });
            assert.equal(response.status, 200);
            assert.deepEqual(response.data, {value: "hello-header"});
        });

        test("resolves cookie params", async () => {
            const response = await http.get("/items/echo/cookie", {
                headers: {Cookie: "session=abc123"},
            });
            assert.equal(response.status, 200);
            assert.deepEqual(response.data, {session: "abc123"});
        });
    });

    describe("body parsing and validation", () => {
        test("parses and validates a JSON body", async () => {
            const response = await http.post("/items", {name: "Widget", quantity: 3});
            assert.equal(response.status, 200);
            assert.deepEqual(response.data, {name: "Widget", quantity: 3});
        });

        test("rejects an invalid body with a 400 and validation details", async () => {
            const response = await http.post("/items", {name: "W", quantity: -1});
            assert.equal(response.status, 400);
            assert.equal(response.data.name, "BadRequestError");
            assert.ok(Array.isArray(response.data.errors));
        });
    });

    describe("authorization", () => {
        test("rejects a missing authorization with 401", async () => {
            const response = await http.get("/secure");
            assert.equal(response.status, 401);
            assert.equal(response.data.fromCustomHandler, true);
        });

        test("resolves @CurrentUser for an authorized request", async () => {
            const response = await http.get("/secure", {headers: {"x-role": "USER"}});
            assert.equal(response.status, 200);
            assert.deepEqual(response.data, {user: {id: 1, name: "Test User"}});
        });

        test("rejects a role-restricted route with 403 when the role doesn't match", async () => {
            const response = await http.get("/secure/admin", {headers: {"x-role": "USER"}});
            assert.equal(response.status, 403);
        });

        test("allows a role-restricted route when the role matches", async () => {
            const response = await http.get("/secure/admin", {headers: {"x-role": "ADMIN"}});
            assert.equal(response.status, 200);
            assert.deepEqual(response.data, {ok: true});
        });
    });

    describe("error handling", () => {
        test("routes a thrown HttpError through the custom ErrorHandlerInterface", async () => {
            const response = await http.get("/errors/bad-request");
            assert.equal(response.status, 400);
            assert.deepEqual(response.data, {
                fromCustomHandler: true,
                message: "custom bad request",
                statusCode: 400,
            });
        });

        test("routes an unexpected error through the custom ErrorHandlerInterface as a 500", async () => {
            const response = await http.get("/errors/boom");
            assert.equal(response.status, 500);
            assert.equal(response.data.fromCustomHandler, true);
            assert.equal(response.data.message, "boom");
        });
    });
});
