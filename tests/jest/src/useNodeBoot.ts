import {NodeBootApp} from "@nodeboot/core";
import {NodeBootTestFramework} from "@nodeboot/test";
import {JestHooksLibrary} from "./JestHooksLibrary";
import {afterAll, afterEach, beforeAll, beforeEach} from "@jest/globals";

export function useNodeBoot<App extends NodeBootApp, CustomLibrary extends JestHooksLibrary = JestHooksLibrary>(
    AppClass: new (...args: any[]) => App,
    callback?: (setupHooks: ReturnType<CustomLibrary["getSetupHooks"]>) => void,
    hooksLibrary: CustomLibrary = new JestHooksLibrary() as CustomLibrary, // Default to HooksLibrary
): ReturnType<CustomLibrary["getReturnHooks"]> {
    // Setup Node-Boot Test Framework
    const framework = new NodeBootTestFramework(AppClass, hooksLibrary);

    beforeAll(async () => {
        await framework.runBeforeAll(callback);
    });

    afterAll(async () => {
        await framework.runAfterAll();
    });

    beforeEach(async () => {
        await framework.runBeforeEachTest();
    });

    afterEach(async () => {
        await framework.runAfterEachTest();
    });

    return framework.getReturnHooks();
}
