import "reflect-metadata";
import {describe, it, afterEach, mock} from "node:test";
import assert from "node:assert/strict";
import {Profile} from "@nodeboot/context";
import {BeansConfigurationAdapter} from "../src/adapters/BeansConfigurationAdapter";
import {PostConstructAdaptor} from "../src/adapters/PostConstructAdapter";
import {Bean} from "../src/decorators/Bean";

function fakeBeansContext(overrides: Partial<any> = {}): any {
    return {
        iocContainer: {
            set: mock.fn(),
            get: mock.fn(),
            has: mock.fn((_key: string) => false),
        },
        config: {
            has: mock.fn((_key: string) => true),
        },
        application: {},
        router: {},
        logger: {info: mock.fn(), warn: mock.fn(), error: mock.fn(), debug: mock.fn()},
        lifecycleBridge: {} as any,
        ...overrides,
    };
}

describe("adapters/BeansConfigurationAdapter", () => {
    const originalActiveProfiles = process.env["NODE_BOOT_ACTIVE_PROFILES"];

    afterEach(() => {
        if (originalActiveProfiles === undefined) {
            delete process.env["NODE_BOOT_ACTIVE_PROFILES"];
        } else {
            process.env["NODE_BOOT_ACTIVE_PROFILES"] = originalActiveProfiles;
        }
    });

    it("registers a primitive-returning sync bean under its method name", async () => {
        class SimpleConfig {
            @Bean()
            greeting() {
                return "Hello World";
            }
        }

        const context = fakeBeansContext();
        const adapter = new BeansConfigurationAdapter(SimpleConfig);
        await adapter.bind(context);

        assert.equal(context.iocContainer.set.mock.calls.length, 1);
        const call = context.iocContainer.set.mock.calls[0]!;
        assert.equal(call.arguments[0], "greeting");
        assert.equal(call.arguments[1], "Hello World");
    });

    class MyBeanService {
        constructor(public label = "my-service") {}
    }

    it("registers an object-returning sync bean under its design:returntype", async () => {
        class ObjectConfig {
            @Bean()
            myService(): MyBeanService {
                return new MyBeanService();
            }
        }

        const context = fakeBeansContext();
        const adapter = new BeansConfigurationAdapter(ObjectConfig);
        await adapter.bind(context);

        assert.equal(context.iocContainer.set.mock.calls.length, 1);
        const call = context.iocContainer.set.mock.calls[0]!;
        assert.equal(call.arguments[0], MyBeanService);
        assert.ok(call.arguments[1] instanceof MyBeanService);
    });

    it("registers a named sync bean under the given name", async () => {
        class NamedConfig {
            @Bean("customName")
            something() {
                return new MyBeanService("named");
            }
        }

        const context = fakeBeansContext();
        const adapter = new BeansConfigurationAdapter(NamedConfig);
        await adapter.bind(context);

        assert.equal(context.iocContainer.set.mock.calls.length, 1);
        const call = context.iocContainer.set.mock.calls[0]!;
        assert.equal(call.arguments[0], "customName");
        assert.ok(call.arguments[1] instanceof MyBeanService);
        assert.equal((call.arguments[1] as MyBeanService).label, "named");
    });

    it("registers a named async bean, awaiting the factory", async () => {
        class AsyncConfig {
            @Bean("asyncService")
            async createService() {
                await Promise.resolve();
                return new MyBeanService("async");
            }
        }

        const context = fakeBeansContext();
        const adapter = new BeansConfigurationAdapter(AsyncConfig);
        await adapter.bind(context);

        assert.equal(context.iocContainer.set.mock.calls.length, 1);
        const call = context.iocContainer.set.mock.calls[0]!;
        assert.equal(call.arguments[0], "asyncService");
        assert.ok(call.arguments[1] instanceof MyBeanService);
        assert.equal((call.arguments[1] as MyBeanService).label, "async");
    });

    it("throws when an async bean factory has no explicit name", async () => {
        class UnnamedAsyncConfig {
            @Bean()
            async createService() {
                return new MyBeanService("unnamed-async");
            }
        }

        const context = fakeBeansContext();
        const adapter = new BeansConfigurationAdapter(UnnamedAsyncConfig);

        await assert.rejects(() => adapter.bind(context), /must be named @Bean\('bean-name'\)/);
        assert.equal(context.iocContainer.set.mock.calls.length, 0);
    });

    it("skips binding when onConfig path is not present in config", async () => {
        class ConditionalConfig {
            @Bean()
            greeting() {
                return "Hi";
            }
        }

        const context = fakeBeansContext({config: {has: mock.fn(() => false)}});
        const adapter = new BeansConfigurationAdapter(ConditionalConfig, {onConfig: "feature.enabled"});
        await adapter.bind(context);

        assert.equal(context.iocContainer.set.mock.calls.length, 0);
        assert.equal(context.config.has.mock.calls.length, 1);
        assert.equal(context.config.has.mock.calls[0]!.arguments[0], "feature.enabled");
    });

    it("binds when onConfig path is present in config", async () => {
        class ConditionalConfig {
            @Bean()
            greeting() {
                return "Hi";
            }
        }

        const context = fakeBeansContext({config: {has: mock.fn(() => true)}});
        const adapter = new BeansConfigurationAdapter(ConditionalConfig, {onConfig: "feature.enabled"});
        await adapter.bind(context);

        assert.equal(context.iocContainer.set.mock.calls.length, 1);
    });

    it("skips binding beans when active profile does not match @Profile", async () => {
        @Profile(["prod"])
        class ProdOnlyConfig {
            @Bean()
            greeting() {
                return "prod-only";
            }
        }

        process.env["NODE_BOOT_ACTIVE_PROFILES"] = "dev";

        const context = fakeBeansContext();
        const adapter = new BeansConfigurationAdapter(ProdOnlyConfig);
        await adapter.bind(context);

        assert.equal(context.iocContainer.set.mock.calls.length, 0);
    });

    it("binds beans when active profile matches @Profile", async () => {
        @Profile(["dev", "test"])
        class DevConfig {
            @Bean()
            greeting() {
                return "dev-only";
            }
        }

        process.env["NODE_BOOT_ACTIVE_PROFILES"] = "dev";

        const context = fakeBeansContext();
        const adapter = new BeansConfigurationAdapter(DevConfig);
        await adapter.bind(context);

        assert.equal(context.iocContainer.set.mock.calls.length, 1);
        const call = context.iocContainer.set.mock.calls[0]!;
        assert.equal(call.arguments[0], "greeting");
        assert.equal(call.arguments[1], "dev-only");
    });

    it("binds beans when no active profiles are set, regardless of @Profile", async () => {
        @Profile(["prod"])
        class ProfiledConfig {
            @Bean()
            greeting() {
                return "no-active-profiles";
            }
        }

        delete process.env["NODE_BOOT_ACTIVE_PROFILES"];

        const context = fakeBeansContext();
        const adapter = new BeansConfigurationAdapter(ProfiledConfig);
        await adapter.bind(context);

        assert.equal(context.iocContainer.set.mock.calls.length, 1);
    });

    it("isPrimitive correctly classifies primitive and non-primitive values", () => {
        const adapter = new BeansConfigurationAdapter(class {});
        assert.equal(adapter.isPrimitive("str"), true);
        assert.equal(adapter.isPrimitive(1), true);
        assert.equal(adapter.isPrimitive(true), true);
        assert.equal(adapter.isPrimitive(Symbol("s")), true);
        assert.equal(adapter.isPrimitive(BigInt(1)), true);
        assert.equal(adapter.isPrimitive({}), false);
        assert.equal(adapter.isPrimitive([]), false);
        assert.equal(adapter.isPrimitive(null), false);
    });
});

describe("adapters/PostConstructAdapter", () => {
    const originalActiveProfiles = process.env["NODE_BOOT_ACTIVE_PROFILES"];

    afterEach(() => {
        if (originalActiveProfiles === undefined) {
            delete process.env["NODE_BOOT_ACTIVE_PROFILES"];
        } else {
            process.env["NODE_BOOT_ACTIVE_PROFILES"] = originalActiveProfiles;
        }
    });

    function fakeFeatureContext(componentBean: any): any {
        return {
            logger: {info: mock.fn(), warn: mock.fn(), error: mock.fn(), debug: mock.fn()},
            iocContainer: {
                get: mock.fn((_target: any) => componentBean),
                set: mock.fn(),
                has: mock.fn((_key: string) => true),
            },
            config: {} as any,
        };
    }

    it("executes the postConstruct function bound to the resolved bean", async () => {
        class MyComponent {
            initialized = false;
        }

        const componentBean = new MyComponent();
        const target = new MyComponent();

        let capturedThis: any;
        const postConstructFunction = function (this: MyComponent) {
            // eslint-disable-next-line @typescript-eslint/no-this-alias -- capturing `this` to assert on it below
            capturedThis = this;
            this.initialized = true;
        };

        const context = fakeFeatureContext(componentBean);
        const adaptor = new PostConstructAdaptor({target, postConstructFunction});

        await adaptor.bind(context);

        assert.equal(context.iocContainer.get.mock.calls.length, 1);
        assert.equal(context.iocContainer.get.mock.calls[0]!.arguments[0], MyComponent);
        assert.equal(capturedThis, componentBean);
        assert.equal(componentBean.initialized, true);
        assert.equal(context.logger.info.mock.calls.length, 2);
    });

    it("awaits an async postConstruct function", async () => {
        class AsyncComponent {
            initialized = false;
        }

        const componentBean = new AsyncComponent();
        const target = new AsyncComponent();

        const postConstructFunction = async function (this: AsyncComponent) {
            await Promise.resolve();
            this.initialized = true;
        };

        const context = fakeFeatureContext(componentBean);
        const adaptor = new PostConstructAdaptor({target, postConstructFunction});

        await adaptor.bind(context);

        assert.equal(componentBean.initialized, true);
    });

    it("skips execution when active profile does not match target's @Profile", async () => {
        @Profile(["prod"])
        class ProfiledComponent {
            initialized = false;
        }

        process.env["NODE_BOOT_ACTIVE_PROFILES"] = "dev";

        const componentBean = new ProfiledComponent();
        const target = new ProfiledComponent();
        const postConstructFunction = mock.fn();

        const context = fakeFeatureContext(componentBean);
        const adaptor = new PostConstructAdaptor({target, postConstructFunction});

        await adaptor.bind(context);

        assert.equal(postConstructFunction.mock.calls.length, 0);
        assert.equal(context.iocContainer.get.mock.calls.length, 0);
        assert.equal(context.logger.info.mock.calls.length, 1);
        assert.match(context.logger.info.mock.calls[0]!.arguments[0] as string, /Skipping @PostConstruct/);
    });

    it("executes when active profile matches target's @Profile", async () => {
        @Profile(["dev"])
        class ProfiledComponent {
            initialized = false;
        }

        process.env["NODE_BOOT_ACTIVE_PROFILES"] = "dev";

        const componentBean = new ProfiledComponent();
        const target = new ProfiledComponent();
        const postConstructFunction = mock.fn();

        const context = fakeFeatureContext(componentBean);
        const adaptor = new PostConstructAdaptor({target, postConstructFunction});

        await adaptor.bind(context);

        assert.equal(postConstructFunction.mock.calls.length, 1);
    });
});
