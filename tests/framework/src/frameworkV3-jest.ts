import "reflect-metadata";
import {NodeBootApp, NodeBootAppView} from "@node-boot/core";
import {afterAll, beforeAll} from "@jest/globals";
import {ApplicationContext, Config, JsonObject} from "@node-boot/context";
import {ConfigService} from "@node-boot/config";

type TestSetup = {
    useMock: ReturnType<typeof createUseMock>;
    useConfig: ReturnType<typeof createUseConfig>;
    useAddress: ReturnType<typeof createUseAddress>;
    useEnv: ReturnType<typeof createUseEnv>;
};

// This function will wrap the `describe` function while adding additional functionality
export function useNodeBoot<App extends NodeBootApp>(
    AppClass: new (...args: any[]) => App,
    callback: (setupOptions: TestSetup) => void,
) {
    let appInstance: App;
    let bootAppView: NodeBootAppView;
    const originalEnv = {...process.env};

    beforeAll(async () => {
        // This is for registering mocks before resolving services
        const preResolveSetup: (() => void)[] = [];
        const useMock = createUseMock(preResolveSetup);

        const preResolveConfig: JsonObject[] = [];
        const useConfig = createUseConfig(preResolveConfig);

        const addressConsumers: ((address: string) => void)[] = [];
        const useAddress = createUseAddress(addressConsumers);

        const patchEnv: Record<string, string> = {};
        const useEnv = createUseEnv(patchEnv);

        callback({
            useMock,
            useConfig,
            useAddress,
            useEnv,
        });

        // Patch env
        Object.assign(process.env, patchEnv);

        const mergedConfigs = Object.assign({}, ...preResolveConfig);

        // Start the NodeBoot application (similar to `beforeAll` hook)
        appInstance = new AppClass();
        bootAppView = await appInstance.start(mergedConfigs);

        // Execute any pre-setup logic (for mock registration)
        preResolveSetup.forEach(setupFn => setupFn());

        // Calculate the base URL after the app starts
        const address = `http://localhost:${bootAppView.appOptions.port}`;
        // Invoke all consumers with the base URL
        addressConsumers.forEach(consumer => consumer(address));
    });

    afterAll(async () => {
        // Stop the application and clear the DI container after tests
        await bootAppView.server.close();
        ApplicationContext.getIocContainer()?.reset();
        setTimeout(() => process.exit(1), 500);

        process.env = originalEnv;
    });
}

/**
 * Creates a `useMock` function that registers mock services during the setup phase.
 * The `useMock` function takes the `serviceClass` and `mock` as arguments.
 */
function createUseMock(preResolveSetup: (() => void)[]) {
    return function useMock<T>(serviceClass: new (...args: any[]) => T, mock: Partial<T>) {
        preResolveSetup.push(() => {
            ApplicationContext.getIocContainer()?.set(serviceClass, mock);
        });
    };
}

/**
 * Creates a `useAddress` function that allows consumers to access the base URL.
 */
function createUseAddress(consumers: ((address: string) => void)[]) {
    return function useBaseUrl(consumer: (address: string) => void) {
        consumers.push(consumer);
    };
}

/**
 * Creates a `useConfig` function that registers configuration data during the setup phase.
 */
function createUseConfig(preResolveConfigs: JsonObject[]) {
    return function useConfig(configData: JsonObject) {
        preResolveConfigs.push(configData);
    };
}

function createUseEnv(patchEnv: Record<string, string>) {
    return function useEnv(envVars: Record<string, string>) {
        Object.assign(patchEnv, envVars);
    };
}

export function useService<T>(serviceClass: new (...args: any[]) => T): T {
    if (!Reflect.hasMetadata("__isService", serviceClass)) {
        throw new Error(`The class ${serviceClass.name} is not decorated with @Service.`);
    }
    const iocContainer = ApplicationContext.getIocContainer();
    if (iocContainer) {
        return iocContainer.get(serviceClass);
    }
    throw new Error(`IOC Container is required for useService hook to work`);
}

export function useAppConfig(): Config {
    const iocContainer = ApplicationContext.getIocContainer();
    if (iocContainer?.has(ConfigService)) {
        return iocContainer.get(ConfigService);
    }
    throw new Error(
        `No Config found in the IOC container. Please bootstrap your NodeBoot server before calling useConfig hook`,
    );
}
