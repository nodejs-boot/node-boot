/**
 * Tests for the `@nodeboot/ghost-server` driver.
 *
 * `GhostServer` is a "pure IoC" adapter: `registerAction()` is a no-op (there's no HTTP transport
 * to register routes against), so unlike every other server adapter there is nothing to drive with
 * `useHttp()`. Instead this covers the two things Ghost is actually for:
 *
 * 1. Booting a Node-Boot app with DI, `@Service`s, and `@Configuration`/`@Bean` wiring, but no
 *    HTTP layer (the CLI/background-job/embedding use case), verified via `useNodeBoot`.
 * 2. `GhostDriver.executeAction(...)`, the method a CLI/embedding caller is expected to invoke
 *    directly to run a controller-style action by hand - exercised here with plain unit tests
 *    against a standalone `GhostDriver` instance.
 */
import {before, describe, test} from "node:test";
import assert from "node:assert/strict";
import "reflect-metadata";
import {Container} from "typedi";
import type {Action, ActionMetadata, AuthorizationChecker, ParamMetadata} from "@nodeboot/context";
import {BadRequestError} from "@nodeboot/error";
import {useNodeBoot} from "@nodeboot/node-test";
import {GhostDriver, GhostServerRequest, GhostServerResponse} from "../src";
import {TestApp} from "./fixtures/TestApp";
import {UserService} from "./fixtures/UserService";

describe("Ghost Server Adapter", () => {
    describe("application boot (pure IoC, no HTTP)", () => {
        // `@nodeboot/node-test` resolves `NodeBootApp` against its own (published) `@nodeboot/core`
        // dependency, which TypeScript treats as nominally distinct from this monorepo's workspace
        // package of the same name - cast at the boundary rather than relaxing `TestApp`'s own typing.
        useNodeBoot(TestApp as any, ({useConfig}) => {
            useConfig({app: {name: "ghost-server-test"}});
        });

        test("resolves a @Service with an injected dependency and an injected @Bean value", () => {
            // Resolved straight from `typedi`'s own `Container` (the same one `TestApp` was booted
            // with via `@EnableDI(Container)`) instead of `useService()`: that hook checks
            // `ApplicationContext.getIocContainer()` off `@nodeboot/node-test`'s own (published)
            // `@nodeboot/context` dependency, which is a different singleton instance than the
            // workspace one this app actually boots against.
            const userService = Container.get(UserService);
            assert.equal(userService.welcome("Ada"), "Hello, Ada! Welcome to ghost-server-test.");
        });
    });

    describe("GhostDriver.executeAction (direct unit tests - the driver's own no-HTTP entry point)", () => {
        let driver: GhostDriver;

        before(() => {
            driver = new GhostDriver();
        });

        const actionMetadata = (overrides: Partial<ActionMetadata> = {}): ActionMetadata =>
            ({headers: {}, ...overrides} as ActionMetadata);

        const param = (type: string, name = ""): ParamMetadata => ({type, name} as ParamMetadata);

        test("extracts path/query/header/cookie/body params from a manually constructed request", async () => {
            const request: GhostServerRequest = {
                params: {id: "42"},
                query: {q: "widgets"},
                headers: {"x-test-header": "hello"},
                cookies: {session: "abc123"},
                body: {name: "Widget"},
            };

            const response = await driver.executeAction(actionMetadata(), request, async action => {
                assert.equal(driver.getParamFromRequest(action, param("param", "id")), "42");
                assert.deepEqual(driver.getParamFromRequest(action, param("params")), {id: "42"});
                assert.equal(driver.getParamFromRequest(action, param("query", "q")), "widgets");
                assert.deepEqual(driver.getParamFromRequest(action, param("queries")), {q: "widgets"});
                assert.equal(driver.getParamFromRequest(action, param("header", "x-test-header")), "hello");
                assert.equal(driver.getParamFromRequest(action, param("cookie", "session")), "abc123");
                assert.deepEqual(driver.getParamFromRequest(action, param("cookies")), {session: "abc123"});
                assert.deepEqual(driver.getParamFromRequest(action, param("body")), {name: "Widget"});
                assert.equal(driver.getParamFromRequest(action, param("body-param", "name")), "Widget");
                return {id: 42};
            });

            assert.equal(response.statusCode, 200);
            assert.deepEqual(response.body, {id: 42});
        });

        test("returns a 204 with a null body for a null result", async () => {
            const response = await driver.executeAction(actionMetadata(), {}, async () => null);
            assert.equal(response.statusCode, 204);
            assert.equal(response.body, null);
        });

        test("honors an explicit successHttpCode", async () => {
            const response = await driver.executeAction(actionMetadata({successHttpCode: 201}), {}, async () => ({
                created: true,
            }));
            assert.equal(response.statusCode, 201);
            assert.deepEqual(response.body, {created: true});
        });

        test("routes a thrown HttpError into a matching error response instead of rejecting", async () => {
            const response = await driver.executeAction(actionMetadata(), {}, async () => {
                throw new BadRequestError("bad input");
            });
            assert.equal(response.statusCode, 400);
            assert.equal((response.body as any).message, "bad input");
        });

        test("resolves with a 401 (not a rejected promise) when authorization fails", async () => {
            driver.authorizationChecker = {check: async () => false} as AuthorizationChecker;

            const response = await driver.executeAction(
                actionMetadata({isAuthorizedUsed: true, authorizedRoles: []}),
                {},
                async () => {
                    assert.fail("the protected action must not run after a failed authorization check");
                },
            );

            assert.equal(response.statusCode, 401);
        });

        test("runs the action when authorization succeeds", async () => {
            driver.authorizationChecker = {check: async () => true} as AuthorizationChecker;

            const response = await driver.executeAction(
                actionMetadata({isAuthorizedUsed: true, authorizedRoles: []}),
                {},
                async () => ({ok: true}),
            );

            assert.equal(response.statusCode, 200);
            assert.deepEqual(response.body, {ok: true});
        });

        test("short-circuits handleSuccess when the action returns the response object itself", () => {
            const response: GhostServerResponse = {statusCode: 200, headers: {}, body: undefined};
            const action = {request: {}, response} as Action<GhostServerRequest, GhostServerResponse>;

            driver.handleSuccess(response, action, actionMetadata());

            assert.equal(response.body, undefined);
        });
    });
});
