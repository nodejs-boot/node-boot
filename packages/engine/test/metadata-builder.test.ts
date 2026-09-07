import "@nodeboot/context"; // ensures the "reflect-metadata" polyfill is loaded before decorators run
import {describe, it, beforeEach} from "node:test";
import assert from "node:assert/strict";
import {Profile} from "@nodeboot/context";

import {MetadataArgsStorage} from "../src/metadata/MetadataArgsStorage";
import {MetadataBuilder} from "../src/metadata/MetadataBuilder";

class SampleController {
    getUser() {
        return "get-user";
    }
}

class BaseController {
    baseMethod() {
        return "base";
    }
    shared() {
        return "base-shared";
    }
}

class ChildController extends BaseController {
    childMethod() {
        return "child";
    }
    override shared() {
        return "child-shared";
    }
}

@Profile(["kubernetes"])
class ProfiledController {
    ping() {
        return "pong";
    }
}

class SampleMiddleware {}
class SampleInterceptor {}

describe("MetadataBuilder", () => {
    beforeEach(() => {
        MetadataArgsStorage.reset();
        delete process.env["NODE_BOOT_ACTIVE_PROFILES"];
    });

    describe("buildControllerMetadata", () => {
        it("builds a full controller/action/param/response-handler graph", () => {
            const storage = MetadataArgsStorage.get();

            storage.controllers.push({
                target: SampleController,
                route: "/users",
                type: "json",
                options: {transformResponse: true},
            });

            storage.actions.push({
                target: SampleController,
                method: "getUser",
                type: "get",
                route: "/:id",
                options: {},
            });

            storage.params.push(
                {
                    object: SampleController.prototype,
                    method: "getUser",
                    index: 0,
                    type: "param",
                    name: "id",
                    parse: false,
                    required: true,
                },
                {
                    object: SampleController.prototype,
                    method: "getUser",
                    index: 1,
                    type: "body",
                    name: "",
                    parse: true,
                    required: false,
                },
            );

            // Controller-level response handlers
            storage.responseHandlers.push({
                target: SampleController,
                type: "authorized",
                value: ["admin"],
            });

            // Action-level response handlers
            storage.responseHandlers.push(
                {target: SampleController, method: "getUser", type: "success-code", value: 201},
                {target: SampleController, method: "getUser", type: "content-type", value: "application/json"},
                {target: SampleController, method: "getUser", type: "location", value: "/users/1"},
                {target: SampleController, method: "getUser", type: "header", value: "X-Trace", secondaryValue: "abc"},
            );

            storage.uses.push({
                target: SampleController,
                method: "getUser",
                middleware: SampleMiddleware,
                afterAction: false,
            });
            storage.useInterceptors.push({
                target: SampleController,
                method: "getUser",
                interceptor: SampleInterceptor,
                global: false,
            });

            const builder = new MetadataBuilder({});
            const [controller] = builder.buildControllerMetadata();
            assert.ok(controller);

            assert.equal(controller.route, "/users");
            assert.equal(controller.isAuthorizedUsed, true);
            assert.deepEqual(controller.authorizedRoles, ["admin"]);
            assert.equal(controller.actions.length, 1);

            const [action] = controller.actions;
            assert.ok(action);
            assert.equal(action.method, "getUser");
            assert.equal(action.fullRoute, "/users/:id");
            assert.equal(action.successHttpCode, 201);
            assert.equal(action.isJsonTyped, true);
            assert.equal(action.isBodyUsed, true);
            assert.deepEqual(action.headers, {
                Location: "/users/1",
                "Content-type": "application/json",
                "X-Trace": "abc",
            });
            assert.equal(action.params.length, 2);
            // params must be sorted by index (0, 1) regardless of registration order
            assert.deepEqual(
                action.params.map(p => p.index),
                [0, 1],
            );
            assert.equal(action.uses.length, 1);
            assert.equal(action.uses[0]!.middleware, SampleMiddleware);
            assert.equal(action.interceptors.length, 1);
            assert.equal(action.interceptors[0]!.interceptor, SampleInterceptor);
        });

        it("uses globalOptions.defaults for undefined/null result codes when no response handler overrides them", () => {
            const storage = MetadataArgsStorage.get();
            storage.controllers.push({target: SampleController, route: "/users", type: "json"});
            storage.actions.push({target: SampleController, method: "getUser", type: "get"});

            const builder = new MetadataBuilder({defaults: {undefinedResultCode: 204, nullResultCode: 404}});
            const [controller] = builder.buildControllerMetadata();
            assert.ok(controller);

            assert.equal(controller.actions[0]!.undefinedResultCode, 204);
            assert.equal(controller.actions[0]!.nullResultCode, 404);
        });

        it("response handler on-undefined/on-null override the global defaults", () => {
            const storage = MetadataArgsStorage.get();
            storage.controllers.push({target: SampleController, route: "/users", type: "json"});
            storage.actions.push({target: SampleController, method: "getUser", type: "get"});
            storage.responseHandlers.push(
                {target: SampleController, method: "getUser", type: "on-undefined", value: 200},
                {target: SampleController, method: "getUser", type: "on-null", value: 200},
            );

            const builder = new MetadataBuilder({defaults: {undefinedResultCode: 204, nullResultCode: 404}});
            const [controller] = builder.buildControllerMetadata();
            assert.ok(controller);

            assert.equal(controller.actions[0]!.undefinedResultCode, 200);
            assert.equal(controller.actions[0]!.nullResultCode, 200);
        });

        it("filters controllers by the given classes list", () => {
            const storage = MetadataArgsStorage.get();
            class OtherController {}
            storage.controllers.push(
                {target: SampleController, route: "/a", type: "json"},
                {target: OtherController, route: "/b", type: "json"},
            );

            const builder = new MetadataBuilder({});
            const result = builder.buildControllerMetadata([SampleController]);

            assert.equal(result.length, 1);
            assert.equal(result[0]!.target, SampleController);
        });

        it("includes @Profile-restricted controllers when no active profiles are configured", () => {
            // allowedProfiles() treats an unset NODE_BOOT_ACTIVE_PROFILES as "allow everything"
            // (opt-out design): profile restrictions only take effect once at least one active
            // profile is configured.
            const storage = MetadataArgsStorage.get();
            storage.controllers.push({target: ProfiledController, route: "/ping", type: "json"});

            const builder = new MetadataBuilder({});
            const result = builder.buildControllerMetadata();
            assert.equal(result.length, 1);
            assert.equal(result[0]!.target, ProfiledController);
        });

        it("excludes controllers restricted to a @Profile that doesn't match any active profile", () => {
            process.env["NODE_BOOT_ACTIVE_PROFILES"] = "production,other";
            const storage = MetadataArgsStorage.get();
            storage.controllers.push({target: ProfiledController, route: "/ping", type: "json"});

            const builder = new MetadataBuilder({});
            assert.deepEqual(builder.buildControllerMetadata(), []);
        });

        it("includes @Profile-restricted controllers when a matching profile is active", () => {
            process.env["NODE_BOOT_ACTIVE_PROFILES"] = "kubernetes,other";
            const storage = MetadataArgsStorage.get();
            storage.controllers.push({target: ProfiledController, route: "/ping", type: "json"});

            const builder = new MetadataBuilder({});
            const result = builder.buildControllerMetadata();
            assert.equal(result.length, 1);
            assert.equal(result[0]!.target, ProfiledController);
        });

        it("walks the prototype chain collecting inherited actions, child overrides winning over base", () => {
            const storage = MetadataArgsStorage.get();
            storage.controllers.push({target: ChildController, route: "/child", type: "json"});
            storage.actions.push(
                {target: ChildController, method: "childMethod", type: "get", route: "/child-method"},
                {target: ChildController, method: "shared", type: "get", route: "/child-shared"},
                {target: BaseController, method: "baseMethod", type: "get", route: "/base-method"},
                {target: BaseController, method: "shared", type: "get", route: "/base-shared-should-be-ignored"},
            );

            const builder = new MetadataBuilder({});
            const [controller] = builder.buildControllerMetadata();
            assert.ok(controller);

            const methods = controller.actions.map(a => a.method).sort();
            assert.deepEqual(methods, ["baseMethod", "childMethod", "shared"]);

            const sharedAction = controller.actions.find(a => a.method === "shared")!;
            assert.equal(sharedAction.route, "/child-shared");
        });

        it("applies default paramOptions.required only when param args omit `required`", () => {
            const storage = MetadataArgsStorage.get();
            storage.controllers.push({target: SampleController, route: "/users", type: "json"});
            storage.actions.push({target: SampleController, method: "getUser", type: "get"});
            storage.params.push(
                {
                    object: SampleController.prototype,
                    method: "getUser",
                    index: 0,
                    type: "param",
                    name: "id",
                    parse: false,
                },
                {
                    object: SampleController.prototype,
                    method: "getUser",
                    index: 1,
                    type: "query",
                    name: "q",
                    parse: false,
                    required: false,
                },
            );

            const builder = new MetadataBuilder({defaults: {paramOptions: {required: true}}});
            const [controller] = builder.buildControllerMetadata();
            assert.ok(controller);
            const params = controller.actions[0]!.params;

            assert.equal(params.find(p => p.name === "id")!.required, true);
            assert.equal(params.find(p => p.name === "q")!.required, false);
        });
    });

    describe("buildMiddlewareMetadata", () => {
        it("builds middleware metadata from raw args", () => {
            const storage = MetadataArgsStorage.get();
            storage.middlewares.push({target: SampleMiddleware, global: true, priority: 5, type: "before"});

            const builder = new MetadataBuilder({});
            const [middleware] = builder.buildMiddlewareMetadata();
            assert.ok(middleware);

            assert.equal(middleware.target, SampleMiddleware);
            assert.equal(middleware.global, true);
            assert.equal(middleware.priority, 5);
            assert.equal(middleware.type, "before");
        });

        it("filters middlewares by the given classes", () => {
            const storage = MetadataArgsStorage.get();
            class OtherMiddleware {}
            storage.middlewares.push(
                {target: SampleMiddleware, global: true, priority: 1, type: "before"},
                {target: OtherMiddleware, global: true, priority: 1, type: "before"},
            );

            const builder = new MetadataBuilder({});
            const result = builder.buildMiddlewareMetadata([SampleMiddleware]);
            assert.equal(result.length, 1);
            assert.equal(result[0]!.target, SampleMiddleware);
        });
    });

    describe("buildInterceptorMetadata", () => {
        it("builds interceptor metadata, mapping target to the interceptor field", () => {
            const storage = MetadataArgsStorage.get();
            storage.interceptors.push({target: SampleInterceptor, global: true, priority: 3});

            const builder = new MetadataBuilder({});
            const [interceptor] = builder.buildInterceptorMetadata();
            assert.ok(interceptor);

            assert.equal(interceptor.target, SampleInterceptor);
            assert.equal(interceptor.interceptor, SampleInterceptor);
            assert.equal(interceptor.priority, 3);
        });
    });
});
