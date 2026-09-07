import {describe, it} from "node:test";
import assert from "node:assert/strict";

import {isPromiseLike} from "../src/util/isPromiseLike";
import {runInSequence} from "../src/util/runInSequence";
import {Param} from "../src/util/Param";
import {ServerConfig} from "../src/util/ServerConfig";
import {ClassFiles} from "../src/util/ClassFiles";

describe("isPromiseLike", () => {
    it("returns true for a native Promise", () => {
        assert.equal(isPromiseLike(Promise.resolve(1)), true);
    });

    it("returns true for a thenable object", () => {
        assert.equal(isPromiseLike({then: () => undefined}), true);
    });

    it("returns false for null and undefined", () => {
        assert.equal(isPromiseLike(null), false);
        assert.equal(isPromiseLike(undefined), false);
    });

    it("returns false for primitives and plain objects without then()", () => {
        assert.equal(isPromiseLike(42), false);
        assert.equal(isPromiseLike("promise"), false);
        assert.equal(isPromiseLike({}), false);
        assert.equal(isPromiseLike({then: "not-a-function"}), false);
    });
});

describe("runInSequence", () => {
    it("executes callback for each item in order and collects results", async () => {
        const order: number[] = [];
        const results = await runInSequence([1, 2, 3], async item => {
            order.push(item);
            return item * 10;
        });

        assert.deepEqual(order, [1, 2, 3]);
        assert.deepEqual(results, [10, 20, 30]);
    });

    it("waits for each promise before starting the next one", async () => {
        const events: string[] = [];
        await runInSequence([20, 5], async delay => {
            events.push(`start-${delay}`);
            await new Promise(resolve => setTimeout(resolve, delay));
            events.push(`end-${delay}`);
            return delay;
        });

        // If execution were parallel, "start-5"/"end-5" would interleave before "end-20"
        assert.deepEqual(events, ["start-20", "end-20", "start-5", "end-5"]);
    });

    it("propagates rejection and stops calling the callback for subsequent items", async () => {
        const calls: number[] = [];
        await assert.rejects(
            runInSequence([1, 2, 3], async item => {
                calls.push(item);
                if (item === 2) throw new Error("boom");
                return item;
            }),
            /boom/,
        );

        assert.deepEqual(calls, [1, 2]);
    });

    it("returns an empty array for an empty collection", async () => {
        const results = await runInSequence([], async (item: never) => item);
        assert.deepEqual(results, []);
    });
});

describe("Param.ofString", () => {
    it("returns empty Optional for null/undefined values", () => {
        assert.equal(Param.ofString(null, {type: "param", name: "x", targetName: "string"}).isEmpty(), true);
        assert.equal(Param.ofString(undefined, {type: "param", name: "x", targetName: "string"}).isEmpty(), true);
    });

    it("parses numbers", () => {
        const result = Param.ofString("42", {type: "param", name: "x", targetName: "number"});
        assert.equal(result.get(), 42);
    });

    it("returns empty Optional for invalid numbers", () => {
        assert.equal(Param.ofString("abc", {type: "param", name: "x", targetName: "number"}).isEmpty(), true);
        assert.equal(Param.ofString("", {type: "param", name: "x", targetName: "number"}).isEmpty(), true);
    });

    it("parses booleans (true/false/1/0/empty string)", () => {
        assert.equal(Param.ofString("true", {type: "param", name: "x", targetName: "boolean"}).get(), true);
        assert.equal(Param.ofString("1", {type: "param", name: "x", targetName: "boolean"}).get(), true);
        assert.equal(Param.ofString("", {type: "param", name: "x", targetName: "boolean"}).get(), true);
        assert.equal(Param.ofString("false", {type: "param", name: "x", targetName: "boolean"}).get(), false);
        assert.equal(Param.ofString("0", {type: "param", name: "x", targetName: "boolean"}).get(), false);
    });

    it("returns empty Optional for unparseable booleans", () => {
        assert.equal(Param.ofString("maybe", {type: "param", name: "x", targetName: "boolean"}).isEmpty(), true);
    });

    it("parses valid dates and rejects invalid ones", () => {
        const valid = Param.ofString("2024-01-01T00:00:00.000Z", {type: "param", name: "x", targetName: "date"});
        assert.ok(valid.get() instanceof Date);

        assert.equal(Param.ofString("not-a-date", {type: "param", name: "x", targetName: "date"}).isEmpty(), true);
    });

    it("defaults to returning the raw string for string/unknown target names", () => {
        assert.equal(Param.ofString("hello", {type: "param", name: "x", targetName: "string"}).get(), "hello");
        assert.equal(Param.ofString("hello", {type: "param", name: "x", targetName: "unknown"}).get(), "hello");
    });
});

describe("ServerConfig", () => {
    it("invokes consumer with resolved options when feature is enabled with options", () => {
        const config = ServerConfig.of({cors: {enabled: true, options: {origin: "*"}}});
        let received: any;
        config.ifCors(opts => (received = opts));
        assert.deepEqual(received, {origin: "*"});
    });

    it("invokes consumer with an empty object when enabled without extra options", () => {
        // Enabled-with-no-sub-options must not collapse to `undefined`, otherwise callers
        // relying on `ifXxx(...)` would see it as "not configured" despite being explicitly enabled.
        const config = ServerConfig.of({cookie: {enabled: true}});
        let received: any;
        config.ifCookies(opts => (received = opts));
        assert.deepEqual(received, {});
    });

    it("invokes 'not' callback when feature is disabled", () => {
        const config = ServerConfig.of({session: {enabled: false}});
        let consumerCalled = false;
        let notCalled = false;
        config.ifSession(
            () => (consumerCalled = true),
            () => (notCalled = true),
        );
        assert.equal(consumerCalled, false);
        assert.equal(notCalled, true);
    });

    it("invokes 'not' callback when feature is not configured at all", () => {
        const config = ServerConfig.of({});
        let notCalled = false;
        config.ifMultipart(
            () => assert.fail("consumer should not be called"),
            () => (notCalled = true),
        );
        assert.equal(notCalled, true);
    });

    it("supports plain options object without an 'enabled' flag", () => {
        const config = ServerConfig.of({template: {options: {engine: "pug"}}});
        let received: any;
        config.ifTemplate(opts => (received = opts));
        assert.deepEqual(received, {engine: "pug"});
    });

    it("handles undefined/null config value gracefully", () => {
        const config = ServerConfig.of(undefined);
        let notCalled = false;
        config.ifCors(
            () => assert.fail("consumer should not be called"),
            () => (notCalled = true),
        );
        assert.equal(notCalled, true);
        assert.equal(config.asOptional().isEmpty(), true);
    });
});

describe("ClassFiles.load", () => {
    class Foo {}
    class Bar {}

    it("collects a single function/class", () => {
        assert.deepEqual(ClassFiles.load(Foo, []), [Foo]);
    });

    it("flattens arrays of functions", () => {
        assert.deepEqual(ClassFiles.load([Foo, Bar], []), [Foo, Bar]);
    });

    it("flattens nested arrays recursively", () => {
        assert.deepEqual(ClassFiles.load([Foo, [Bar, [Foo]]], []), [Foo, Bar, Foo]);
    });

    it("flattens module-like objects (e.g. CommonJS exports)", () => {
        const moduleLike = {Foo, Bar};
        assert.deepEqual(ClassFiles.load(moduleLike, []), [Foo, Bar]);
    });

    it("flattens arrays of module-like objects", () => {
        assert.deepEqual(ClassFiles.load([{Foo}, {Bar}], []), [Foo, Bar]);
    });

    it("appends to a pre-populated accumulator instead of replacing it", () => {
        assert.deepEqual(ClassFiles.load(Bar, [Foo]), [Foo, Bar]);
    });

    it("ignores primitives that are neither functions, arrays nor objects", () => {
        assert.deepEqual(ClassFiles.load(42 as any, []), []);
        assert.deepEqual(ClassFiles.load("skip" as any, []), []);
    });
});
