import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {Injectable, Injector} from "@nonnajs/di";
import {NonnaContainerAdapter} from "../src/ioc/NonnaContainerAdapter";
import {createDefaultDiOptions, registerNonnaAlias} from "../src/ioc/defaultContainer";

describe("NonnaContainerAdapter", () => {
    it("resolves a class registered directly on the wrapped Injector", () => {
        class Widget {}

        const injector = Injector.create();
        injector.register({provide: Widget, useClass: Widget});
        const adapter = new NonnaContainerAdapter(injector);

        assert.equal(adapter.has(Widget), true);
        assert.ok(adapter.get(Widget) instanceof Widget);
    });

    it("set() registers a value provider resolvable via get()", () => {
        const adapter = new NonnaContainerAdapter(Injector.create());

        adapter.set("greeting", "hello");

        assert.equal(adapter.has("greeting"), true);
        assert.equal(adapter.get("greeting"), "hello");
    });

    it("has() is false for an unregistered token", () => {
        const adapter = new NonnaContainerAdapter(Injector.create());
        assert.equal(adapter.has("missing"), false);
    });

    it("reset() swaps in a fresh Injector, clearing prior registrations", () => {
        const adapter = new NonnaContainerAdapter(Injector.create());
        adapter.set("key", "value");
        assert.equal(adapter.has("key"), true);

        adapter.reset();

        assert.equal(adapter.has("key"), false);
    });

    it("refresh() pulls in @Injectable()-decorated classes from Nonna's global registry", () => {
        @Injectable()
        class ScannedService {}

        const adapter = new NonnaContainerAdapter(Injector.create());
        adapter.refresh();

        assert.ok(adapter.get(ScannedService) instanceof ScannedService);
    });

    it("initialize() validates the graph and surfaces missing-provider errors", async () => {
        @Injectable()
        class NeedsMissingDep {
            constructor(dep: unknown) {
                void dep;
            }
        }
        void NeedsMissingDep;
        // No explicit dependency was ever recorded for NeedsMissingDep's constructor param, so it
        // stays UNRESOLVED - initialize() must reject instead of silently succeeding.
        const adapter = new NonnaContainerAdapter(Injector.create());

        await assert.rejects(() => adapter.initialize());
    });

    it("applies alias registrations from the injected alias list, once the target is registered", () => {
        class AliasTarget {}

        const injector = Injector.create();
        injector.register({provide: AliasTarget, useClass: AliasTarget});
        const adapter = new NonnaContainerAdapter(injector, () => [["alias-token", AliasTarget]]);

        adapter.refresh();

        assert.equal(adapter.has("alias-token"), true);
        assert.equal(adapter.get("alias-token"), adapter.get(AliasTarget));
    });

    it("createDefaultDiOptions() wires registerNonnaAlias()'d tokens into the returned container", () => {
        @Injectable()
        class DefaultAliasTarget {}

        // registerNonnaAlias() feeds a process-wide alias list read by every future
        // createDefaultDiOptions() call, mirroring how decorateDi() records @Component("id").
        registerNonnaAlias("default-alias-target", DefaultAliasTarget);

        const {iocContainer} = createDefaultDiOptions();

        assert.equal(iocContainer.has("default-alias-target"), true);
        assert.ok(iocContainer.get("default-alias-target") instanceof DefaultAliasTarget);
    });
});
