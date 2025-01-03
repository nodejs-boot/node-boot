import {Hook} from "./hooks/Hook";
import {NodeBootAppView} from "@node-boot/core";

export class HookManager {
    private hooks: Hook[] = [];

    addHook(hook: Hook) {
        this.hooks.push(hook);
        // Sort hooks by priority (ascending)
        this.hooks.sort((a, b) => a.getPriority() - b.getPriority());
    }

    async runBeforeStart() {
        for (const hook of this.hooks) {
            await hook.beforeStart();
        }
    }

    async runAfterStart(bootApp: NodeBootAppView) {
        for (const hook of this.hooks) {
            await hook.afterStart(bootApp);
        }
    }

    async runBeforeTests() {
        for (const hook of this.hooks) {
            await hook.beforeTests();
        }
    }

    async runAfterTests() {
        for (const hook of this.hooks) {
            await hook.afterTests();
        }
    }
}
