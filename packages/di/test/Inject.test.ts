import "@nodeboot/context";
import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {Injector} from "@nonnajs/di";
import {Inject, REQUIRES_FIELD_INJECTION_KEY} from "../src/decorators/Inject";
import {decorateDi} from "../src/ioc/makeDiDecoration";

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

    describe("Nonna wiring", () => {
        it("wires an explicit @Inject(Dependency) constructor param for resolution via Nonna", () => {
            class NonnaDependency {}

            class NonnaConsumer {
                constructor(@Inject(NonnaDependency) readonly dependency: NonnaDependency) {}
            }

            decorateDi(NonnaDependency);
            decorateDi(NonnaConsumer);

            const injector = Injector.create();
            injector.refresh();

            const consumer = injector.get(NonnaConsumer);
            assert.ok(consumer.dependency instanceof NonnaDependency);
        });

        it("wires an explicit @Inject('string-token') constructor param for resolution via Nonna", () => {
            class NonnaStringTokenConsumer {
                constructor(@Inject("nonna-app-name") readonly appName: string) {}
            }

            decorateDi(NonnaStringTokenConsumer);

            const injector = Injector.create();
            injector.register({provide: "nonna-app-name", useValue: "my-app"});
            injector.refresh();

            assert.equal(injector.get(NonnaStringTokenConsumer).appName, "my-app");
        });

        it("wires an explicit @Inject(Dependency) class field for resolution via Nonna", () => {
            class NonnaPropDependency {}

            class NonnaPropConsumer {
                @Inject(NonnaPropDependency)
                dependency!: NonnaPropDependency;
            }

            decorateDi(NonnaPropDependency);
            decorateDi(NonnaPropConsumer);

            const injector = Injector.create();
            injector.refresh();

            const consumer = injector.get(NonnaPropConsumer);
            assert.ok(consumer.dependency instanceof NonnaPropDependency);
        });

        it("wires an explicit @Inject('string-token') class field for resolution via Nonna", () => {
            class NonnaStringTokenPropConsumer {
                @Inject("nonna-field-app-name")
                appName!: string;
            }

            decorateDi(NonnaStringTokenPropConsumer);

            const injector = Injector.create();
            injector.register({provide: "nonna-field-app-name", useValue: "my-app"});
            injector.refresh();

            assert.equal(injector.get(NonnaStringTokenPropConsumer).appName, "my-app");
        });

        it("a bare @Inject() class field falls back to design:type, just like a bare @Inject() constructor param", () => {
            class NonnaBareFieldDependency {}

            class NonnaBareFieldConsumer {
                @Inject()
                dependency!: NonnaBareFieldDependency;
            }

            decorateDi(NonnaBareFieldDependency);
            decorateDi(NonnaBareFieldConsumer);

            const injector = Injector.create();
            injector.refresh();

            const consumer = injector.get(NonnaBareFieldConsumer);
            assert.ok(consumer.dependency instanceof NonnaBareFieldDependency);
        });
    });
});
