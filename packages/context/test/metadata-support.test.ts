import "reflect-metadata";
import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {InterceptorMetadata} from "../src/metadata/InterceptorMetadata";
import {MiddlewareMetadata} from "../src/metadata/MiddlewareMetadata";
import {ResponseHandlerMetadata} from "../src/metadata/ResponseHandleMetadata";
import {UseMetadata} from "../src/metadata/UseMetadata";

class SomeController {}

class SomeInterceptor {}

class SomeMiddleware {}

class CustomMiddlewareWithUse {
    use() {
        return "used";
    }
}

class CustomMiddlewareWithOnError {
    onError() {
        return "handled";
    }
}

describe("InterceptorMetadata", () => {
    it("copies fields from args", () => {
        const metadata = new InterceptorMetadata({
            target: SomeController,
            method: "list",
            interceptor: SomeInterceptor,
            global: true,
            priority: 5,
        });
        assert.equal(metadata.target, SomeController);
        assert.equal(metadata.method, "list");
        assert.equal(metadata.interceptor, SomeInterceptor);
        assert.equal(metadata.global, true);
        assert.equal(metadata.priority, 5);
    });

    it("defaults priority to 0 when not provided", () => {
        const metadata = new InterceptorMetadata({
            target: SomeController,
            interceptor: SomeInterceptor,
        } as any);
        assert.equal(metadata.priority, 0);
    });

    it("defaults priority to 0 when explicitly undefined", () => {
        const metadata = new InterceptorMetadata({
            target: SomeController,
            interceptor: SomeInterceptor,
            priority: undefined,
        } as any);
        assert.equal(metadata.priority, 0);
    });
});

describe("MiddlewareMetadata", () => {
    it("copies fields from args", () => {
        const metadata = new MiddlewareMetadata({
            global: true,
            target: SomeMiddleware,
            priority: 3,
            type: "before",
        });
        assert.equal(metadata.global, true);
        assert.equal(metadata.target, SomeMiddleware);
        assert.equal(metadata.priority, 3);
        assert.equal(metadata.type, "before");
    });

    it("resolves an instance of the target middleware from the default container", () => {
        const metadata = new MiddlewareMetadata({
            global: false,
            target: SomeMiddleware,
            priority: 0,
            type: "after",
        });
        const instance = metadata.instance;
        assert.ok(instance instanceof SomeMiddleware);
    });
});

describe("ResponseHandlerMetadata", () => {
    it("copies fields from args (matching the shape produced by @Authorized)", () => {
        const metadata = new ResponseHandlerMetadata({
            type: "authorized",
            target: SomeController,
            method: "list",
            value: ["ADMIN"],
        });
        assert.equal(metadata.target, SomeController);
        assert.equal(metadata.method, "list");
        assert.equal(metadata.type, "authorized");
        assert.deepEqual(metadata.value, ["ADMIN"]);
        assert.equal(metadata.secondaryValue, undefined);
    });

    it("copies a secondaryValue when provided (matching a @Header-like decorator)", () => {
        const metadata = new ResponseHandlerMetadata({
            type: "header",
            target: SomeController,
            method: "list",
            value: "X-Custom",
            secondaryValue: "some-value",
        });
        assert.equal(metadata.value, "X-Custom");
        assert.equal(metadata.secondaryValue, "some-value");
    });
});

describe("UseMetadata", () => {
    it("copies fields from args", () => {
        const metadata = new UseMetadata({
            target: SomeController,
            method: "list",
            middleware: SomeMiddleware,
            afterAction: true,
        });
        assert.equal(metadata.target, SomeController);
        assert.equal(metadata.method, "list");
        assert.equal(metadata.middleware, SomeMiddleware);
        assert.equal(metadata.afterAction, true);
    });

    it("isCustomMiddleware() is true when middleware.prototype defines use()", () => {
        const metadata = new UseMetadata({
            target: SomeController,
            middleware: CustomMiddlewareWithUse,
            afterAction: false,
        });
        assert.ok(metadata.isCustomMiddleware());
    });

    it("isCustomMiddleware() is falsy when middleware has no use()", () => {
        const metadata = new UseMetadata({
            target: SomeController,
            middleware: SomeMiddleware,
            afterAction: false,
        });
        assert.ok(!metadata.isCustomMiddleware());
    });

    it("isErrorMiddleware() is true when middleware.prototype defines onError()", () => {
        const metadata = new UseMetadata({
            target: SomeController,
            middleware: CustomMiddlewareWithOnError,
            afterAction: false,
        });
        assert.ok(metadata.isErrorMiddleware());
    });

    it("isErrorMiddleware() is falsy when middleware has no onError()", () => {
        const metadata = new UseMetadata({
            target: SomeController,
            middleware: SomeMiddleware,
            afterAction: false,
        });
        assert.ok(!metadata.isErrorMiddleware());
    });
});
