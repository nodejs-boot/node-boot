import {NodeBootApp, NodeBootAppView} from "@node-boot/core";
import {HookManager} from "./HookManager";
import {HooksLibrary} from "./HooksLibrary";
import {ApplicationContext} from "@node-boot/context";

export class NodeBootTestFramework<App extends NodeBootApp, CustomLibrary extends HooksLibrary = HooksLibrary> {
    private appInstance!: App;
    private bootAppView!: NodeBootAppView;
    private hookManager: HookManager;
    private hooksLibrary: CustomLibrary;

    constructor(private AppClass: new (...args: any[]) => App, hooksLibrary: CustomLibrary) {
        this.hookManager = new HookManager();
        this.hooksLibrary = hooksLibrary;

        // Register hooks from the provided library
        this.hooksLibrary.registerHooks(this.hookManager);
    }

    async runBeforeAll(
        setupCallback?: (setupHooks: ReturnType<CustomLibrary["getSetupHooks"]>) => void,
    ): Promise<void> {
        // Allow user-defined setup via callback
        setupCallback?.(this.hooksLibrary.getSetupHooks() as any);

        // Run all `runBeforeStart` hooks
        await this.hookManager.runBeforeStart();

        // Start the application
        this.appInstance = new this.AppClass();
        this.bootAppView = await this.appInstance.start(this.hooksLibrary.getConfigHook().getState("config"));

        // Run all `runAfterStart` hooks
        await this.hookManager.runAfterStart(this.bootAppView);

        // Run all `runBeforeTests` hooks
        await this.hookManager.runBeforeTests();
    }

    async runAfterAll(): Promise<void> {
        // Stop the application
        await this.bootAppView.server.close();
        ApplicationContext.getIocContainer()?.reset();

        await this.hookManager.runAfterTests();

        setTimeout(() => process.exit(1), 500);
    }

    async runBeforeEachTest(): Promise<void> {
        // Run all `beforeEach` hooks
        await this.hookManager.runBeforeEachTest();
    }

    async runAfterEachTest(): Promise<void> {
        // Run all `afterEach` hooks
        await this.hookManager.runAfterEachTest();
    }

    getReturnHooks(): ReturnType<CustomLibrary["getReturnHooks"]> {
        return this.hooksLibrary.getReturnHooks() as any;
    }
}
