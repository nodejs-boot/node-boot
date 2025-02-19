import {HookManager, HooksLibrary, ReturnHooks, SetUpHooks} from "@nodeboot/test";
import {SpyHook, TimerHook} from "./hooks";

export type JestSetUpHooks = SetUpHooks & {};

export type JestReturnHooks = ReturnHooks & {
    useSpy: SpyHook["use"];
    useTimer: TimerHook["use"];
};

export class JestHooksLibrary extends HooksLibrary {
    spyHook = new SpyHook();
    timerHook = new TimerHook();

    override registerHooks(hookManager: HookManager) {
        super.registerHooks(hookManager);
        hookManager.addHook(this.spyHook);
        hookManager.addHook(this.timerHook);
    }

    override getSetupHooks(): JestSetUpHooks {
        const baseHooks = super.getSetupHooks();
        return {
            ...baseHooks,
        };
    }

    override getReturnHooks(): JestReturnHooks {
        const baseHooks = super.getReturnHooks();
        return {
            ...baseHooks,
            useSpy: this.spyHook.use.bind(this.spyHook),
            useTimer: this.timerHook.use.bind(this.timerHook),
        };
    }
}
