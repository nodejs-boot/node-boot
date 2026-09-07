import "@nodeboot/context";
import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {ApplicationContext, IocContainer} from "@nodeboot/context";
import {EnableDI} from "../src/decorators/EnableDI";

function makeContainer(): IocContainer {
    return {
        get: (() => undefined) as IocContainer["get"],
        set: (() => undefined) as unknown as IocContainer["set"],
        has: () => false,
        reset: () => undefined,
    };
}

describe("EnableDI", () => {
    it("returns a function instead of applying immediately", () => {
        const container = makeContainer();

        const enabler = EnableDI(container);

        assert.equal(typeof enabler, "function");
        // The context must not have been mutated with this exact container reference yet.
        assert.notEqual(ApplicationContext.get().diOptions?.iocContainer, container);
    });

    it("sets ApplicationContext.diOptions.iocContainer and options only once invoked", () => {
        const container = makeContainer();
        const options = {fallback: true, fallbackOnErrors: false};

        EnableDI(container, options)();

        const context = ApplicationContext.get();
        assert.equal(context.diOptions?.iocContainer, container);
        assert.equal(context.diOptions?.options, options);
    });

    it("works without providing options", () => {
        const container = makeContainer();

        EnableDI(container)();

        const context = ApplicationContext.get();
        assert.equal(context.diOptions?.iocContainer, container);
        assert.equal(context.diOptions?.options, undefined);
    });

    it("overwrites previously configured diOptions on the singleton context", () => {
        const first = makeContainer();
        const second = makeContainer();

        EnableDI(first)();
        assert.equal(ApplicationContext.get().diOptions?.iocContainer, first);

        EnableDI(second)();
        assert.equal(ApplicationContext.get().diOptions?.iocContainer, second);
        assert.notEqual(ApplicationContext.get().diOptions?.iocContainer, first);
    });

    it("ApplicationContext.get() always resolves to the same singleton instance", () => {
        assert.equal(ApplicationContext.get(), ApplicationContext.get());
    });
});
