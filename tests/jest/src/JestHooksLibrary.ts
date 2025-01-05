import {HookManager, HooksLibrary, ReturnHooks, SetUpHooks} from "@node-boot/test";
import {SpyHook} from "./hooks";

export type JestSetUpHooks = SetUpHooks & {
    useSpy: SpyHook["call"];
};

export type JestReturnHooks = ReturnHooks & {
    useSpy: SpyHook["use"];
};

export class JestHooksLibrary extends HooksLibrary {
    spyHook = new SpyHook();

    override registerHooks(hookManager: HookManager) {
        super.registerHooks(hookManager);
        hookManager.addHook(this.spyHook);
    }

    override getSetupHooks(): JestSetUpHooks {
        const baseHooks = super.getSetupHooks();
        return {
            ...baseHooks,
            useSpy: this.spyHook.call.bind(this.spyHook),
        };
    }

    override getReturnHooks(): JestReturnHooks {
        const baseHooks = super.getReturnHooks();
        return {
            ...baseHooks,
            useSpy: this.spyHook.use.bind(this.spyHook),
        };
    }
}
