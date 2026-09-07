import "@nodeboot/context";
import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {Inject, REQUIRES_FIELD_INJECTION_KEY} from "../src/decorators/Inject";

class Dependency {}

describe("Inject decorator", () => {
    it("registers the property name in the REQUIRES_FIELD_INJECTION_KEY metadata array", () => {
        class Foo {
            @Inject(Dependency)
            dependency!: Dependency;
        }

        const injectProperties = Reflect.getMetadata(REQUIRES_FIELD_INJECTION_KEY, Foo.prototype);
        assert.deepEqual(injectProperties, ["dependency"]);
    });

    it("accumulates metadata across multiple decorated properties on the same class, in declaration order", () => {
        class Foo {
            @Inject(Dependency)
            a!: Dependency;

            @Inject(Dependency)
            b!: Dependency;

            @Inject(Dependency)
            c!: Dependency;
        }

        const injectProperties = Reflect.getMetadata(REQUIRES_FIELD_INJECTION_KEY, Foo.prototype);
        assert.deepEqual(injectProperties, ["a", "b", "c"]);
    });

    it("keeps metadata isolated per class (does not leak across unrelated classes)", () => {
        class Foo {
            @Inject(Dependency)
            a!: Dependency;
        }

        class Bar {
            @Inject(Dependency)
            b!: Dependency;
        }

        assert.deepEqual(Reflect.getMetadata(REQUIRES_FIELD_INJECTION_KEY, Foo.prototype), ["a"]);
        assert.deepEqual(Reflect.getMetadata(REQUIRES_FIELD_INJECTION_KEY, Bar.prototype), ["b"]);
    });

    it("does not register field-injection metadata for symbol-keyed properties", () => {
        const mySymbol = Symbol("dependency");

        class Foo {
            @Inject(Dependency)
            [mySymbol]!: Dependency;
        }

        assert.equal(Reflect.getMetadata(REQUIRES_FIELD_INJECTION_KEY, Foo.prototype), undefined);
    });

    it("does not register field-injection metadata for constructor-parameter injection (no propertyName)", () => {
        class Foo {
            constructor(@Inject(Dependency) readonly dependency: Dependency) {}
        }

        // Constructor parameter decorators receive an undefined propertyName, so the
        // "requires field injection" bookkeeping (used for property injection) must be skipped.
        assert.equal(Reflect.getMetadata(REQUIRES_FIELD_INJECTION_KEY, Foo), undefined);
        assert.equal(Reflect.getMetadata(REQUIRES_FIELD_INJECTION_KEY, Foo.prototype), undefined);
    });

    it("delegates to decorateInjection and still succeeds (returns no error) when a concrete type is given", () => {
        assert.doesNotThrow(() => {
            class Foo {
                @Inject(Dependency)
                dependency!: Dependency;
            }
            void Foo;
        });
    });

    it("propagates CannotInjectValueError thrown by the underlying typedi Inject when the type cannot be resolved", () => {
        assert.throws(
            () => {
                class Foo {
                    // No explicit type/token is passed and no design:type metadata is available for
                    // this manually-declared property, so typedi cannot resolve an injectable type.
                    @Inject()
                    dependency!: unknown;
                }
                void Foo;
            },
            (error: any) => error.name === "CannotInjectValueError",
        );
    });
});
