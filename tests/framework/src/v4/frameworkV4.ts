import {NodeBootApp, NodeBootAppView} from "@node-boot/core";
import {MockHook} from "./hooks/MockHook";
import {ConfigHook} from "./hooks/ConfigHook";
import {AddressHook} from "./hooks/AddressHook";
import {EnvHook} from "./hooks/EnvHook";
import {HookManager} from "./HookManager";
import {ApplicationContext} from "@node-boot/context";
import {AppContextHook} from "./hooks/AppContextHook";

export type SetUpHooks = {
    useAppContext: AppContextHook["call"];
    useMock: MockHook["call"];
    useConfig: ConfigHook["call"];
    useAddress: AddressHook["call"];
    useEnv: EnvHook["call"];
};

export function useNodeBoot<App extends NodeBootApp>(
    AppClass: new (...args: any[]) => App,
    callback: (setupHooks: SetUpHooks) => void,
) {
    let appInstance: App;
    let bootAppView: NodeBootAppView;
    const hookManager = new HookManager();

    // Instantiate hooks
    const appContextHook = new AppContextHook();
    const mockHook = new MockHook();
    const configHook = new ConfigHook();
    const envHook = new EnvHook();
    const addressHook = new AddressHook();

    // Register hooks with the manager
    hookManager.addHook(appContextHook);
    hookManager.addHook(mockHook);
    hookManager.addHook(configHook);
    hookManager.addHook(envHook);
    hookManager.addHook(addressHook);

    const setupOptions: SetUpHooks = {
        useMock: mockHook.call.bind(mockHook),
        useAppContext: appContextHook.call.bind(appContextHook),
        useConfig: configHook.call.bind(configHook),
        useEnv: envHook.call.bind(envHook),
        useAddress: addressHook.call.bind(addressHook),
    };

    beforeAll(async () => {
        // Allow users to set up their options
        callback(setupOptions);

        // Run all `runBeforeStart` hooks
        await hookManager.runBeforeStart();

        // Start the application
        appInstance = new AppClass();
        bootAppView = await appInstance.start(configHook.getState("config"));

        // Run all `runAfterStart` hooks
        await hookManager.runAfterStart(bootAppView);

        // Run all `runBeforeTests` hooks
        await hookManager.runBeforeTests();
    });

    afterAll(async () => {
        // Stop the application
        await bootAppView.server.close();
        ApplicationContext.getIocContainer()?.reset();

        // Run all `afterAll` hooks
        await hookManager.runAfterTests();

        setTimeout(() => process.exit(1), 500);
    });
}
