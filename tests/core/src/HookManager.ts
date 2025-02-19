import {Hook} from "./hooks";
import {NodeBootAppView} from "@nodeboot/core";

export class HookManager {
    private hooks: Hook[] = [];

    addHook(hook: Hook) {
        console.log(`Adding hook: ${hook.constructor.name}`);
        this.hooks.push(hook);
        // Sort hooks by priority (ascending)
        this.hooks.sort((a, b) => a.getPriority() - b.getPriority());
    }

    async runBeforeStart() {
        console.log(`Hooks sorted by priority. Current order: ${this.hooks.map(h => h.constructor.name).join(", ")}`);

        console.log("Running beforeStart phase for all hooks.");
        for (const hook of this.hooks) {
            console.log(`Running beforeStart for hook: ${hook.constructor.name}(p${hook.getPriority()})`);
            await hook.beforeStart();
        }
        console.log("Completed beforeStart phase.");
    }

    async runAfterStart(bootApp: NodeBootAppView) {
        console.log("Running afterStart phase for all hooks.");
        for (const hook of this.hooks) {
            console.log(`Running afterStart for hook: ${hook.constructor.name}(p${hook.getPriority()})`);
            await hook.afterStart(bootApp);
        }
        console.log("Completed afterStart phase.");
    }

    async runBeforeTests() {
        console.log("Running beforeTests phase for all hooks.");
        for (const hook of this.hooks) {
            console.log(`Running beforeTests for hook: ${hook.constructor.name}(p${hook.getPriority()})`);
            await hook.beforeTests();
        }
        console.log("Completed beforeTests phase.");
    }

    async runAfterTests() {
        console.log("Running afterTests phase for all hooks.");
        for (const hook of this.hooks) {
            console.log(`Running afterTests for hook: ${hook.constructor.name}(p${hook.getPriority()})`);
            await hook.afterTests();
        }
        console.log("Completed afterTests phase.");
    }

    async runBeforeEachTest() {
        console.log("Running beforeEachTest phase for all hooks.");
        for (const hook of this.hooks) {
            console.log(`Running beforeEachTest for hook: ${hook.constructor.name}(p${hook.getPriority()})`);
            await hook.beforeEachTest();
        }
        console.log("Completed beforeEachTest phase.");
    }

    async runAfterEachTest() {
        console.log("Running afterEachTest phase for all hooks.");
        for (const hook of this.hooks) {
            console.log(`Running afterEachTest for hook: ${hook.constructor.name}(p${hook.getPriority()})`);
            await hook.afterEachTest();
        }
        console.log("Completed afterEachTest phase.");
    }
}
