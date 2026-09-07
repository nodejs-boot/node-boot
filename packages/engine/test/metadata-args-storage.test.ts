import {describe, it, beforeEach} from "node:test";
import assert from "node:assert/strict";

import {MetadataArgsStorage} from "../src/metadata/MetadataArgsStorage";

class ControllerA {}
class ControllerB {}
class MiddlewareA {}
class InterceptorA {}

describe("MetadataArgsStorage", () => {
    beforeEach(() => {
        MetadataArgsStorage.reset();
    });

    describe("singleton behavior", () => {
        it("get() always returns the same global instance", () => {
            const first = MetadataArgsStorage.get();
            const second = MetadataArgsStorage.get();
            assert.equal(first, second);
        });

        it("reset() drops the global singleton so get() returns a fresh instance", () => {
            const storage = MetadataArgsStorage.get();
            storage.controllers.push({target: ControllerA, type: "json"});

            MetadataArgsStorage.reset();

            const fresh = MetadataArgsStorage.get();
            assert.notEqual(fresh, storage);
            assert.deepEqual(fresh.controllers, []);
        });

        it("reset() is a no-op safe to call when nothing was ever initialized", () => {
            MetadataArgsStorage.reset();
            assert.doesNotThrow(() => MetadataArgsStorage.reset());
        });
    });

    describe("instance.reset()", () => {
        it("clears all registered metadata arrays back to empty", () => {
            const storage = MetadataArgsStorage.get();
            storage.controllers.push({target: ControllerA, type: "json"});
            storage.middlewares.push({target: MiddlewareA, global: true, priority: 0, type: "before"});
            storage.interceptors.push({target: InterceptorA, global: true, priority: 0});
            storage.uses.push({target: ControllerA, middleware: MiddlewareA} as any);
            storage.useInterceptors.push({target: ControllerA, interceptor: InterceptorA} as any);
            storage.actions.push({target: ControllerA, method: "get", type: "get", parse: false} as any);
            storage.params.push({object: new ControllerA(), method: "get", index: 0, type: "param", parse: false});
            storage.responseHandlers.push({target: ControllerA, type: "success-code", value: 200});
            storage.models.push({target: ControllerA} as any);
            storage.modelProperties.push({target: ControllerA, property: "id"} as any);

            storage.reset();

            assert.deepEqual(storage.controllers, []);
            assert.deepEqual(storage.middlewares, []);
            assert.deepEqual(storage.interceptors, []);
            assert.deepEqual(storage.uses, []);
            assert.deepEqual(storage.useInterceptors, []);
            assert.deepEqual(storage.actions, []);
            assert.deepEqual(storage.params, []);
            assert.deepEqual(storage.responseHandlers, []);
            assert.deepEqual(storage.models, []);
            assert.deepEqual(storage.modelProperties, []);
        });
    });

    describe("filter methods", () => {
        it("filterMiddlewareMetadatasForClasses returns only matching, defined entries", () => {
            const storage = MetadataArgsStorage.get();
            const middlewareArgsA = {target: MiddlewareA, global: true, priority: 1, type: "before" as const};
            storage.middlewares.push(middlewareArgsA);

            const result = storage.filterMiddlewareMetadatasForClasses([MiddlewareA, ControllerB]);
            assert.deepEqual(result, [middlewareArgsA]);
        });

        it("filterInterceptorMetadatasForClasses filters by target class membership", () => {
            const storage = MetadataArgsStorage.get();
            const interceptorArgsA = {target: InterceptorA, global: true, priority: 1};
            storage.interceptors.push(interceptorArgsA);

            assert.deepEqual(storage.filterInterceptorMetadatasForClasses([InterceptorA]), [interceptorArgsA]);
            assert.deepEqual(storage.filterInterceptorMetadatasForClasses([ControllerB]), []);
        });

        it("filterControllerMetadatasForClasses filters by target class membership", () => {
            const storage = MetadataArgsStorage.get();
            const controllerArgsA = {target: ControllerA, type: "json" as const};
            const controllerArgsB = {target: ControllerB, type: "json" as const};
            storage.controllers.push(controllerArgsA, controllerArgsB);

            assert.deepEqual(storage.filterControllerMetadatasForClasses([ControllerA]), [controllerArgsA]);
        });

        it("filterActionsWithTarget filters actions registered for a given controller class", () => {
            const storage = MetadataArgsStorage.get();
            const actionA = {target: ControllerA, method: "get", type: "get"};
            const actionB = {target: ControllerB, method: "post", type: "post"};
            storage.actions.push(actionA as any, actionB as any);

            assert.deepEqual(storage.filterActionsWithTarget(ControllerA), [actionA]);
        });

        it("filterUsesWithTargetAndMethod filters by target and method name", () => {
            const storage = MetadataArgsStorage.get();
            const use1 = {target: ControllerA, method: "get", middleware: MiddlewareA};
            const use2 = {target: ControllerA, method: "post", middleware: MiddlewareA};
            storage.uses.push(use1 as any, use2 as any);

            assert.deepEqual(storage.filterUsesWithTargetAndMethod(ControllerA, "get"), [use1]);
        });

        it("filterInterceptorUsesWithTargetAndMethod filters by target and method name", () => {
            const storage = MetadataArgsStorage.get();
            const use1 = {target: ControllerA, method: "get", interceptor: InterceptorA};
            const use2 = {target: ControllerA, method: undefined, interceptor: InterceptorA};
            storage.useInterceptors.push(use1 as any, use2 as any);

            assert.deepEqual(storage.filterInterceptorUsesWithTargetAndMethod(ControllerA, "get"), [use1]);
            assert.deepEqual(storage.filterInterceptorUsesWithTargetAndMethod(ControllerA, undefined), [use2]);
        });

        it("filterParamsWithTargetAndMethod filters by the object's constructor and method name", () => {
            const storage = MetadataArgsStorage.get();
            const instance = new ControllerA();
            const paramA = {object: instance, method: "get", index: 0, type: "param" as const, parse: false};
            const paramB = {object: instance, method: "post", index: 0, type: "param" as const, parse: false};
            storage.params.push(paramA, paramB);

            assert.deepEqual(storage.filterParamsWithTargetAndMethod(ControllerA, "get"), [paramA]);
        });

        it("filterResponseHandlersWithTarget filters by target class only", () => {
            const storage = MetadataArgsStorage.get();
            const handlerA = {target: ControllerA, type: "success-code" as const, value: 201};
            const handlerB = {target: ControllerB, type: "success-code" as const, value: 202};
            storage.responseHandlers.push(handlerA, handlerB);

            assert.deepEqual(storage.filterResponseHandlersWithTarget(ControllerA), [handlerA]);
        });

        it("filterResponseHandlersWithTargetAndMethod filters by target class and method", () => {
            const storage = MetadataArgsStorage.get();
            const handlerA = {target: ControllerA, method: "get", type: "success-code" as const, value: 201};
            const handlerB = {target: ControllerA, method: "post", type: "success-code" as const, value: 202};
            storage.responseHandlers.push(handlerA, handlerB);

            assert.deepEqual(storage.filterResponseHandlersWithTargetAndMethod(ControllerA, "get"), [handlerA]);
        });

        it("filterModelsByTarget filters registered models by target", () => {
            const storage = MetadataArgsStorage.get();
            const modelA = {target: ControllerA};
            const modelB = {target: ControllerB};
            storage.models.push(modelA as any, modelB as any);

            assert.deepEqual(storage.filterModelsByTarget(ControllerA), [modelA]);
        });

        it("filterPropertyByTarget filters registered model properties by target", () => {
            const storage = MetadataArgsStorage.get();
            const propA = {target: ControllerA, property: "id"};
            const propB = {target: ControllerB, property: "name"};
            storage.modelProperties.push(propA as any, propB as any);

            assert.deepEqual(storage.filterPropertyByTarget(ControllerA), [propA]);
        });
    });
});
