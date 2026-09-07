import "reflect-metadata";
import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {ActionMetadata} from "../src/metadata/ActionMetadata";
import {ControllerMetadata} from "../src/metadata/ControllerMetadata";
import {ResponseHandlerMetadata} from "../src/metadata/ResponseHandleMetadata";
import {ParamMetadata} from "../src/metadata/ParamMetadata";
import {ActionMetadataArgs} from "../src/metadata/args";
import {NodeBootEngineOptions} from "../src/options";
import {Action} from "../src/types";

class UsersController {
    list(a: number, b: number) {
        return a + b;
    }

    async asyncList() {
        return "async-result";
    }
}

const noopGlobalOptions: NodeBootEngineOptions = {};

function makeControllerMetadata(overrides: Record<string, any> = {}) {
    return new ControllerMetadata({
        target: UsersController,
        route: "/users",
        type: "json",
        ...overrides,
    } as any);
}

function makeActionMetadata(
    controllerMetadata: ControllerMetadata,
    args: Partial<ActionMetadataArgs> = {},
    globalOptions: NodeBootEngineOptions = noopGlobalOptions,
) {
    const action = new ActionMetadata(
        controllerMetadata,
        {
            target: UsersController,
            method: "list",
            type: "get",
            ...args,
        } as ActionMetadataArgs,
        globalOptions,
    );
    // params is populated externally by the metadata builder before build() is invoked.
    action.params = [];
    return action;
}

describe("ControllerMetadata", () => {
    it("assigns fields from constructor args", () => {
        const controller = makeControllerMetadata();
        assert.equal(controller.target, UsersController);
        assert.equal(controller.route, "/users");
        assert.equal(controller.type, "json");
    });

    it("resolves an instance from the default container", () => {
        const controller = makeControllerMetadata();
        const action: Action = {request: {}, response: {}};
        const instance = controller.getInstance(action);
        assert.ok(instance instanceof UsersController);
    });

    it("build() marks authorization unused when no matching response handler exists", () => {
        const controller = makeControllerMetadata();
        controller.build([]);
        assert.equal(controller.isAuthorizedUsed, false);
        assert.deepEqual(controller.authorizedRoles, []);
    });

    it("build() picks up controller-level @Authorized handler (no method set)", () => {
        const controller = makeControllerMetadata();
        const handlers = [
            new ResponseHandlerMetadata({
                type: "authorized",
                target: UsersController,
                value: ["ADMIN", "OWNER"],
            }),
        ];
        controller.build(handlers);
        assert.equal(controller.isAuthorizedUsed, true);
        assert.deepEqual(controller.authorizedRoles, ["ADMIN", "OWNER"]);
    });

    it("build() ignores an @Authorized handler scoped to a specific method", () => {
        const controller = makeControllerMetadata();
        const handlers = [
            new ResponseHandlerMetadata({
                type: "authorized",
                target: UsersController,
                method: "list",
                value: ["ADMIN"],
            }),
        ];
        controller.build(handlers);
        assert.equal(controller.isAuthorizedUsed, false);
    });
});

describe("ActionMetadata.appendBaseRoute (static)", () => {
    it("prefixes a bare base route with a slash for string routes", () => {
        assert.equal(ActionMetadata.appendBaseRoute("api", "/users"), "/api/users");
    });

    it("does not double the slash when base route already starts with one", () => {
        assert.equal(ActionMetadata.appendBaseRoute("/api", "/users"), "/api/users");
    });

    it("returns the bare route unmodified when base route is empty", () => {
        assert.equal(ActionMetadata.appendBaseRoute("", "/users"), "/users");
    });

    it("returns the regex route unmodified when base route is empty", () => {
        const route = /^\/users$/;
        assert.equal(ActionMetadata.appendBaseRoute("", route), route);
    });

    it("wraps a regex route with the base route prefix", () => {
        const route = /\/users$/;
        const result = ActionMetadata.appendBaseRoute("/api", route) as RegExp;
        assert.ok(result instanceof RegExp);
        assert.equal(result.source, "^\\/api\\/users$\\/?$");
        assert.equal(result.flags, route.flags);
    });
});

describe("ActionMetadata construction", () => {
    it("copies simple fields from args", () => {
        const controller = makeControllerMetadata();
        const action = makeActionMetadata(controller, {
            route: "/list",
            method: "list",
            type: "get",
        });
        assert.equal(action.controllerMetadata, controller);
        assert.equal(action.route, "/list");
        assert.equal(action.target, UsersController);
        assert.equal(action.method, "list");
        assert.equal(action.type, "get");
    });
});

describe("ActionMetadata.build()", () => {
    it("computes fullRoute by combining controller route + action route (string)", () => {
        const controller = makeControllerMetadata({route: "/users"} as any);
        const action = makeActionMetadata(controller, {route: "/list", type: "get"});
        action.build([]);
        assert.equal(action.fullRoute, "/users/list");
    });

    it("computes fullRoute for a regex action route with a controller route", () => {
        const controller = makeControllerMetadata({route: "/users"} as any);
        const action = makeActionMetadata(controller, {route: /\/list$/, type: "get"});
        action.build([]);
        assert.ok(action.fullRoute instanceof RegExp);
        assert.equal((action.fullRoute as RegExp).source, "^\\/users\\/list$\\/?$");
    });

    it("falls back to global option defaults for undefined/null result codes", () => {
        const controller = makeControllerMetadata();
        const action = makeActionMetadata(
            controller,
            {},
            {
                defaults: {undefinedResultCode: 204, nullResultCode: 404},
            },
        );
        action.build([]);
        assert.equal(action.undefinedResultCode, 204);
        assert.equal(action.nullResultCode, 404);
    });

    it("prefers an explicit on-undefined/on-null response handler over global defaults", () => {
        const controller = makeControllerMetadata();
        const action = makeActionMetadata(
            controller,
            {},
            {
                defaults: {undefinedResultCode: 204, nullResultCode: 404},
            },
        );
        action.build([
            new ResponseHandlerMetadata({type: "on-undefined", target: UsersController, value: 210}),
            new ResponseHandlerMetadata({type: "on-null", target: UsersController, value: 410}),
        ]);
        assert.equal(action.undefinedResultCode, 210);
        assert.equal(action.nullResultCode, 410);
    });

    it("applies success-code, redirect and rendered-template handlers", () => {
        const controller = makeControllerMetadata();
        const action = makeActionMetadata(controller);
        action.build([
            new ResponseHandlerMetadata({type: "success-code", target: UsersController, value: 201}),
            new ResponseHandlerMetadata({type: "redirect", target: UsersController, value: "/somewhere"}),
            new ResponseHandlerMetadata({type: "rendered-template", target: UsersController, value: "index.html"}),
        ]);
        assert.equal(action.successHttpCode, 201);
        assert.equal(action.redirect, "/somewhere");
        assert.equal(action.renderedTemplate, "index.html");
    });

    it("builds response headers from location, content-type and header handlers", () => {
        const controller = makeControllerMetadata();
        const action = makeActionMetadata(controller);
        action.build([
            new ResponseHandlerMetadata({type: "location", target: UsersController, value: "/created"}),
            new ResponseHandlerMetadata({type: "content-type", target: UsersController, value: "application/json"}),
            new ResponseHandlerMetadata({
                type: "header",
                target: UsersController,
                value: "X-Custom",
                secondaryValue: "yes",
            }),
        ]);
        assert.deepEqual(action.headers, {
            Location: "/created",
            "Content-type": "application/json",
            "X-Custom": "yes",
        });
    });

    it("marks isJsonTyped from content-type handler regardless of controller type", () => {
        const controller = makeControllerMetadata({type: "default"} as any);
        const action = makeActionMetadata(controller);
        action.build([
            new ResponseHandlerMetadata({type: "content-type", target: UsersController, value: "application/json"}),
        ]);
        assert.equal(action.isJsonTyped, true);
    });

    it("falls back to controller type for isJsonTyped when no content-type handler exists", () => {
        const jsonController = makeControllerMetadata({type: "json"} as any);
        const jsonAction = makeActionMetadata(jsonController);
        jsonAction.build([]);
        assert.equal(jsonAction.isJsonTyped, true);

        const defaultController = makeControllerMetadata({type: "default"} as any);
        const defaultAction = makeActionMetadata(defaultController);
        defaultAction.build([]);
        assert.equal(defaultAction.isJsonTyped, false);
    });

    it("derives isBodyUsed/isFileUsed/isFilesUsed from params", () => {
        const controller = makeControllerMetadata();
        const action = makeActionMetadata(controller);
        action.params = [
            {index: 0, type: "body", extraOptions: {max: 1}} as ParamMetadata,
            {index: 1, type: "file"} as ParamMetadata,
        ];
        action.build([]);
        assert.equal(action.isBodyUsed, true);
        assert.equal(action.isFileUsed, true);
        assert.equal(action.isFilesUsed, false);
        assert.deepEqual(action.bodyExtraOptions, {max: 1});
    });

    it("sorts params by index once during build", () => {
        const controller = makeControllerMetadata();
        const action = makeActionMetadata(controller);
        action.params = [
            {index: 2, type: "param"} as ParamMetadata,
            {index: 0, type: "param"} as ParamMetadata,
            {index: 1, type: "param"} as ParamMetadata,
        ];
        action.build([]);
        assert.deepEqual(
            action.params.map(p => p.index),
            [0, 1, 2],
        );
    });

    it("combines controller-level and action-level authorized roles", () => {
        const controller = makeControllerMetadata();
        controller.build([
            new ResponseHandlerMetadata({type: "authorized", target: UsersController, value: ["ADMIN"]}),
        ]);
        const action = makeActionMetadata(controller, {method: "list"});
        action.build([
            new ResponseHandlerMetadata({
                type: "authorized",
                target: UsersController,
                method: "list",
                value: ["OWNER"],
            }),
        ]);
        assert.equal(action.isAuthorizedUsed, true);
        assert.deepEqual(action.authorizedRoles, ["ADMIN", "OWNER"]);
    });
});

describe("ActionMetadata.callMethod()", () => {
    it("invokes the target controller method with the given params", async () => {
        const controller = makeControllerMetadata();
        const action = makeActionMetadata(controller, {method: "list"});
        const result = await action.callMethod([2, 3], {request: {}, response: {}});
        assert.equal(result, 5);
    });

    it("awaits an async controller method", async () => {
        const controller = makeControllerMetadata();
        const action = makeActionMetadata(controller, {method: "asyncList"});
        const result = await action.callMethod([], {request: {}, response: {}});
        assert.equal(result, "async-result");
    });
});
