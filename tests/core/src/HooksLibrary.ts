import {HookManager} from "./HookManager";
import {
    AddressHook,
    AppContextHook,
    CleanupHook,
    ConfigHook,
    EnvHook,
    HttpClientHook,
    MockHook,
    PactumHook,
    RepositoryHook,
    ServiceHook,
} from "./hooks";

export type SetUpHooks = {
    useAppContext: AppContextHook["call"];
    useMock: MockHook["call"];
    useConfig: ConfigHook["call"];
    useAddress: AddressHook["call"];
    useEnv: EnvHook["call"];
    useCleanup: CleanupHook["call"];
    usePactum: PactumHook["call"];
};

export type ReturnHooks = {
    useConfig: ConfigHook["use"];
    useHttp: HttpClientHook["use"];
    useAppContext: AppContextHook["use"];
    useMock: MockHook["use"];
    useService: ServiceHook["use"];
    useRepository: RepositoryHook["use"];
};

export class HooksLibrary {
    appContextHook = new AppContextHook();
    mockHook = new MockHook();
    configHook = new ConfigHook();
    envHook = new EnvHook();
    addressHook = new AddressHook();
    cleanupHook = new CleanupHook();
    pactumHook = new PactumHook();
    httpClientHook = new HttpClientHook();
    serviceHook = new ServiceHook();
    repositoryHook = new RepositoryHook();

    registerHooks(hookManager: HookManager) {
        hookManager.addHook(this.appContextHook);
        hookManager.addHook(this.mockHook);
        hookManager.addHook(this.configHook);
        hookManager.addHook(this.envHook);
        hookManager.addHook(this.addressHook);
        hookManager.addHook(this.cleanupHook);
        hookManager.addHook(this.pactumHook);
        hookManager.addHook(this.httpClientHook);
        hookManager.addHook(this.serviceHook);
        hookManager.addHook(this.repositoryHook);
    }

    getSetupHooks(): SetUpHooks {
        return {
            useAppContext: this.appContextHook.call.bind(this.appContextHook),
            useMock: this.mockHook.call.bind(this.mockHook),
            useConfig: this.configHook.call.bind(this.configHook),
            useEnv: this.envHook.call.bind(this.envHook),
            useAddress: this.addressHook.call.bind(this.addressHook),
            useCleanup: this.cleanupHook.call.bind(this.cleanupHook),
            usePactum: this.pactumHook.call.bind(this.pactumHook),
        };
    }

    getReturnHooks(): ReturnHooks {
        return {
            useConfig: this.configHook.use.bind(this.configHook),
            useHttp: this.httpClientHook.use.bind(this.httpClientHook),
            useAppContext: this.appContextHook.use.bind(this.appContextHook),
            useMock: this.mockHook.use.bind(this.mockHook),
            useService: this.serviceHook.use.bind(this.serviceHook),
            useRepository: this.repositoryHook.use.bind(this.repositoryHook),
        };
    }

    getConfigHook() {
        return this.configHook;
    }
}
