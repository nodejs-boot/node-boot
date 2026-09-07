import {describe, it, beforeEach} from "node:test";
import assert from "node:assert/strict";
import {useContainer, getFromContainer} from "../src/ioc/container";
import {IocContainer} from "../src/ioc/types";

class FooService {
    public readonly id = Math.random();
}

class BarService {
    public readonly id = Math.random();
}

/**
 * Minimal fake IocContainer used to drive `useContainer`. Only `get` is exercised by
 * `getFromContainer`, the remaining members exist purely to satisfy the interface.
 */
function fakeContainer(getImpl: (someClass: any, action?: any) => any): IocContainer {
    return {
        get: getImpl,
        set: () => undefined as any,
        has: () => false,
        reset: () => undefined,
    };
}

describe("ioc/container", () => {
    describe("default container (no useContainer set)", () => {
        // Module state (`userContainer`) is a singleton, so make sure no previous test
        // in this file left a custom container installed.
        beforeEach(() => {
            useContainer(undefined as any, undefined);
        });

        it("returns an instance of the requested class", () => {
            const instance = getFromContainer(FooService);
            assert.ok(instance instanceof FooService);
        });

        it("caches and returns the same instance for repeated calls with the same class", () => {
            const first = getFromContainer(FooService);
            const second = getFromContainer(FooService);
            assert.equal(first, second);
        });

        it("returns different instances for different classes", () => {
            const foo = getFromContainer(FooService);
            const bar = getFromContainer(BarService);
            assert.notEqual(foo as unknown, bar as unknown);
            assert.ok(foo instanceof FooService);
            assert.ok(bar instanceof BarService);
        });
    });

    describe("useContainer overriding the default container", () => {
        it("delegates resolution to the user-provided container", () => {
            const sentinel = new FooService();
            const custom = fakeContainer(someClass => {
                assert.equal(someClass, FooService);
                return sentinel;
            });

            useContainer(custom);

            const resolved = getFromContainer(FooService);
            assert.equal(resolved, sentinel);
        });

        it("passes the action through to the user container's get()", () => {
            const action = {request: {}, response: {}} as any;
            let receivedAction: any;
            const custom = fakeContainer((_someClass, act) => {
                receivedAction = act;
                return new FooService();
            });

            useContainer(custom);

            getFromContainer(FooService, action);
            assert.equal(receivedAction, action);
        });
    });

    describe("fallback option", () => {
        it("without fallback: returns the falsy value as-is when the custom container returns undefined", () => {
            const custom = fakeContainer(() => undefined);
            useContainer(custom);

            const resolved = getFromContainer(FooService);
            assert.equal(resolved, undefined);
        });

        it("without fallback: returns the falsy value as-is when the custom container returns null", () => {
            const custom = fakeContainer(() => null);
            useContainer(custom);

            const resolved = getFromContainer(FooService);
            assert.equal(resolved, null);
        });

        it("with fallback=true: falls back to the default container when the custom container returns undefined", () => {
            const custom = fakeContainer(() => undefined);
            useContainer(custom, {fallback: true});

            const resolved = getFromContainer(FooService);
            assert.ok(resolved instanceof FooService);
        });

        it("with fallback=false: still returns the falsy value as-is", () => {
            const custom = fakeContainer(() => undefined);
            useContainer(custom, {fallback: false});

            const resolved = getFromContainer(FooService);
            assert.equal(resolved, undefined);
        });

        it("does not fall back when the custom container returns a truthy instance", () => {
            const sentinel = new FooService();
            const custom = fakeContainer(() => sentinel);
            useContainer(custom, {fallback: true});

            const resolved = getFromContainer(FooService);
            assert.equal(resolved, sentinel);
        });
    });

    describe("fallbackOnErrors option", () => {
        it("without fallbackOnErrors: rethrows the error from the custom container", () => {
            const custom = fakeContainer(() => {
                throw new Error("boom");
            });
            useContainer(custom);

            assert.throws(() => getFromContainer(FooService), /boom/);
        });

        it("with fallbackOnErrors=false: still rethrows the error", () => {
            const custom = fakeContainer(() => {
                throw new Error("boom");
            });
            useContainer(custom, {fallbackOnErrors: false});

            assert.throws(() => getFromContainer(FooService), /boom/);
        });

        it("with fallbackOnErrors=true: falls back to the default container when the custom container throws", () => {
            const custom = fakeContainer(() => {
                throw new Error("boom");
            });
            useContainer(custom, {fallbackOnErrors: true});

            const resolved = getFromContainer(FooService);
            assert.ok(resolved instanceof FooService);
        });
    });
});
