import "reflect-metadata";
import {Container} from "typedi";
import {NodeBootApp, NodeBootAppView} from "@node-boot/core";
import {after, before} from "node:test";
import {JsonObject} from "@node-boot/context";

type TestSetup = {
    useMock: ReturnType<typeof createUseMock>;
    useConfig: ReturnType<typeof createUseConfig>;
};

// This function will wrap the `describe` function while adding additional functionality
export function useNodeBoot<App extends NodeBootApp>(
    AppClass: new (...args: any[]) => App,
    callback: (setupOptions: TestSetup) => void,
) {
    let appInstance: App;
    let bootAppView: NodeBootAppView;

    before(async () => {
        // This is for registering mocks before resolving services
        const preResolveSetup: (() => void)[] = [];
        const useMock = createUseMock(preResolveSetup);

        const preResolveConfig: JsonObject[] = [];
        const useConfig = createUseConfig(preResolveConfig);
        callback({
            useMock,
            useConfig,
        });

        const mergedConfigs = Object.assign({}, ...preResolveConfig);

        // Start the NodeBoot application (similar to `beforeAll` hook)
        appInstance = new AppClass();
        bootAppView = await appInstance.start(mergedConfigs);

        // Execute any pre-setup logic (for mock registration)
        preResolveSetup.forEach(setupFn => setupFn());
    });

    after(async () => {
        // Stop the application and clear the DI container after tests
        await bootAppView.server.close();
        Container.reset();

        // Optional: Gracefully exit after tests are done (if needed)
        setTimeout(() => process.exit(1), 500);
    });
}

/**
 * Creates a `useMock` function that registers mock services during the setup phase.
 * The `useMock` function takes the `serviceClass` and `mock` as arguments.
 */
function createUseMock(preResolveSetup: (() => void)[]) {
    return function useMock<T>(serviceClass: new (...args: any[]) => T, mock: Partial<T>) {
        preResolveSetup.push(() => {
            Container.set(serviceClass, mock);
        });
    };
}

/**
 * Creates a `useMock` function that registers mock services during the setup phase.
 * The `useMock` function takes the `serviceClass` and `mock` as arguments.
 */
function createUseConfig(preResolveConfigs: JsonObject[]) {
    return function useConfig(configData: JsonObject) {
        preResolveConfigs.push(configData);
    };
}

export function useService<T>(serviceClass: new (...args: any[]) => T): T {
    return Container.get(serviceClass);
}
