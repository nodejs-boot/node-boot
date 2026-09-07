import "@nodeboot/context";
import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {decorateInjection} from "../src/ioc/makeInjectionDecoration";

class Dependency {}

describe("decorateInjection", () => {
    it("returns true and succeeds via typedi when an explicit injectable type is provided (property injection)", () => {
        class Target {}

        const result = decorateInjection(Target.prototype, "dependency", undefined, Dependency);

        assert.equal(result, true);
    });

    it("returns true and succeeds via typedi when an explicit injectable type is provided (constructor-parameter injection, no propertyName)", () => {
        class Target {}

        const result = decorateInjection(Target, undefined as unknown as string, 0, Dependency);

        assert.equal(result, true);
    });

    it("throws (does not fall back to inversify) when typedi raises CannotInjectValueError for property injection", () => {
        class Target {}

        // No options and no design:type metadata available for this manually-invoked property,
        // so typedi cannot infer an injectable type and raises CannotInjectValueError, which
        // decorateInjection must re-throw instead of silently falling back to inversify.
        assert.throws(
            () => decorateInjection(Target.prototype, "dependency"),
            (error: any) => error.name === "CannotInjectValueError",
        );
    });

    it("throws CannotInjectValueError for index-based (constructor-parameter) injection when no type can be resolved", () => {
        class Target {}

        assert.throws(
            () => decorateInjection(Target, undefined as unknown as string, 0),
            (error: any) => error.name === "CannotInjectValueError",
        );
    });

    it("supports string service identifiers as injection options", () => {
        class Target {}

        const result = decorateInjection(Target.prototype, "dependency", undefined, "some-service-id");

        assert.equal(result, true);
    });

    it("supports lazy type resolvers (Newable) as injection options, avoiding CannotInjectValueError", () => {
        class Target {}

        const result = decorateInjection(Target.prototype, "dependency", undefined, () => Dependency);

        assert.equal(result, true);
    });
});
