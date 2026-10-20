import "@nodeboot/context";
import {afterEach, describe, it} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {Injector} from "@nonnajs/di";
import {ApplicationContext} from "@nodeboot/context";
import {EnableDI} from "../src/decorators/EnableDI";
import {Inject} from "../src/decorators/Inject";
import {createDefaultDiOptions} from "../src/ioc/defaultContainer";
import {decorateDi} from "../src/ioc/makeDiDecoration";
import {isDiPluginActive, resetDiPlugin} from "../src/ioc/plugin";

describe("DI plugin (@EnableDI)", () => {
    afterEach(() => {
        resetDiPlugin();
        Container.reset();
        ApplicationContext.get().diOptions = undefined;
    });

    it("leaves TypeDI untouched while no plugin container was selected, even though typedi is installed", () => {
        class DefaultOnly {}

        decorateDi(DefaultOnly);

        assert.equal(isDiPluginActive(), false);
        assert.equal(Container.has(DefaultOnly), false);
    });

    it("still registers with Nonna, the default container, regardless of the plugin", () => {
        class ViaNonna {}

        decorateDi(ViaNonna);
        EnableDI(Container)();

        const injector = Injector.create();
        injector.refresh();
        assert.ok(injector.get(ViaNonna) instanceof ViaNonna);
    });

    it("replays beans decorated BEFORE @EnableDI through the plugin library", () => {
        class Early {}
        decorateDi(Early);

        EnableDI(Container)();

        assert.equal(isDiPluginActive(), true);
        assert.ok(Container.get(Early) instanceof Early);
    });

    it("applies beans decorated AFTER @EnableDI immediately", () => {
        EnableDI(Container)();

        class Late {}
        decorateDi(Late);

        assert.ok(Container.get(Late) instanceof Late);
    });

    it("replays @Inject so the plugin container injects the dependency", () => {
        class Dependency {}
        class Consumer {
            // TypeDI takes a lazy type resolver, exactly as it did before Nonna became the default.
            @Inject(() => Dependency)
            dependency!: Dependency;
        }
        decorateDi(Dependency);
        decorateDi(Consumer);

        EnableDI(Container)();

        assert.ok(Container.get(Consumer).dependency instanceof Dependency);
    });

    it("makes the plugin container the application's IoC container instead of the Nonna default", () => {
        EnableDI(Container)();

        assert.equal(ApplicationContext.get().diOptions?.iocContainer, Container);
        // `createDefaultDiOptions()` (what BaseServer uses when no container was supplied) is unaffected.
        assert.notEqual(createDefaultDiOptions().iocContainer, Container);
    });

    it("is idempotent: activating twice does not decorate a bean twice", () => {
        class Once {}
        decorateDi(Once);

        EnableDI(Container)();
        EnableDI(Container)();

        assert.ok(Container.get(Once) instanceof Once);
    });
});
