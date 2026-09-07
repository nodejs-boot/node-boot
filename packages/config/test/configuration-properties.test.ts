import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {ApplicationContext} from "@nodeboot/context"; // also installs the global reflect-metadata shim
import type {ConfigurationPropertiesAdapter, IocContainer} from "@nodeboot/context";
import {ConfigReader} from "@backstage/config";
import {ConfigurationProperties} from "../src/decorator/ConfigurationProperties";
import {ConfigService} from "../src/service/ConfigService";

class FakeIocContainer implements IocContainer {
    private readonly store = new Map<string, any>();

    get<T>(id: any): T {
        return this.store.get(id);
    }

    set(id: any, value: any): any {
        this.store.set(id, value);
        return this;
    }

    has(id: any): boolean {
        return this.store.has(id);
    }

    reset(): void {
        this.store.clear();
    }
}

function lastAdapter(): ConfigurationPropertiesAdapter {
    const adapters = ApplicationContext.get().configurationPropertiesAdapters;
    const adapter = adapters[adapters.length - 1];
    assert.ok(adapter, "expected at least one configurationPropertiesAdapter to be registered");
    return adapter;
}

describe("ConfigurationProperties decorator", () => {
    it("registers config metadata on the decorated class", () => {
        @ConfigurationProperties({configName: "metadataConfig", configPath: "metadata.section"})
        class MetadataConfig {
            foo!: string;
        }

        assert.equal(Reflect.getMetadata("config:isConfigProperties", MetadataConfig), true);
        assert.equal(Reflect.getMetadata("config:path", MetadataConfig), "metadata.section");
    });

    it("registers a configurationPropertiesAdapter on the ApplicationContext", () => {
        const before = ApplicationContext.get().configurationPropertiesAdapters.length;

        @ConfigurationProperties({configName: "registeredConfig", configPath: "registered.section"})
        class RegisteredConfig {
            foo!: string;
        }

        const adapters = ApplicationContext.get().configurationPropertiesAdapters;
        assert.equal(adapters.length, before + 1);
        assert.equal(typeof lastAdapter().bind, "function");
        assert.equal(Reflect.getMetadata("config:path", RegisteredConfig), "registered.section");
    });

    it("binds matching config properties onto a new instance and registers it in the ioc container", () => {
        @ConfigurationProperties({configName: "boundConfig", configPath: "my.section"})
        class BoundConfig {
            foo!: string;
            bar!: number;
        }
        const adapter = lastAdapter();

        const config = new ConfigService();
        config.setConfig(new ConfigReader({my: {section: {foo: "hello", bar: 42}}}));

        const container = new FakeIocContainer();
        container.set("config", config);

        adapter.bind(container);

        assert.ok(container.has("boundConfig"));
        const instance = container.get<BoundConfig>("boundConfig");
        assert.ok(instance instanceof BoundConfig);
        assert.equal(instance.foo, "hello");
        assert.equal(instance.bar, 42);
    });

    it("only copies own enumerable properties present in config onto the instance", () => {
        @ConfigurationProperties({configName: "partialConfig", configPath: "partial.section"})
        class PartialConfig {
            foo = "default-foo";
            untouched = "default-untouched";
        }
        const adapter = lastAdapter();

        const config = new ConfigService();
        config.setConfig(new ConfigReader({partial: {section: {foo: "overridden"}}}));

        const container = new FakeIocContainer();
        container.set("config", config);

        adapter.bind(container);

        const instance = container.get<PartialConfig>("partialConfig");
        assert.equal(instance.foo, "overridden");
        assert.equal(instance.untouched, "default-untouched");
    });

    it("throws when the config path is completely missing", () => {
        @ConfigurationProperties({configName: "missingPathConfig", configPath: "does.not.exist"})
        class MissingPathConfig {
            foo!: string;
        }
        const adapter = lastAdapter();

        const config = new ConfigService();
        config.setConfig(new ConfigReader({}));

        const container = new FakeIocContainer();
        container.set("config", config);

        assert.throws(() => adapter.bind(container), /Missing required config value at 'does\.not\.exist'/);
        assert.equal(Reflect.getMetadata("config:path", MissingPathConfig), "does.not.exist");
    });

    it("throws a 'Configuration for prefix not found' error when the resolved value is falsy", () => {
        @ConfigurationProperties({configName: "falsyConfig", configPath: "falsy.section"})
        class FalsyConfig {
            foo!: string;
        }
        const adapter = lastAdapter();

        const config = new ConfigService();
        // "falsy.section" resolves to `false`, which is present but falsy,
        // hitting the decorator's own `if (configProperties)` guard rather
        // than backstage config's "missing" error.
        config.setConfig(new ConfigReader({falsy: {section: false}}));

        const container = new FakeIocContainer();
        container.set("config", config);

        assert.throws(() => adapter.bind(container), /Configuration for prefix 'falsy\.section' not found\./);
        assert.equal(Reflect.getMetadata("config:path", FalsyConfig), "falsy.section");
    });

    it("throws when a bean is already registered under the same config name", () => {
        @ConfigurationProperties({configName: "duplicateConfig", configPath: "dup.section"})
        class DuplicateConfig {
            foo!: string;
        }
        const adapter = lastAdapter();

        const config = new ConfigService();
        config.setConfig(new ConfigReader({dup: {section: {foo: "x"}}}));

        const container = new FakeIocContainer();
        container.set("config", config);
        container.set("duplicateConfig", {already: "registered"});

        assert.throws(
            () => adapter.bind(container),
            /There is already a bean registered with name duplicateConfig\. Please check your @ConfigurationProperties classes for duplicated config names\./,
        );
        assert.equal(Reflect.getMetadata("config:path", DuplicateConfig), "dup.section");
    });
});
