import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {CatalogClient} from "@backstage/catalog-client";
import {BackstageConfiguration} from "../src/config/BackstageConfiguration";
import {BackstageIntegrationConfig} from "../src/config/types";
import {PluginDiscoveryService} from "../src/service/PluginDiscoveryService";

function createMockBeansContext(configMap: Record<string, any> = {}) {
    const logs: {level: string; message: string}[] = [];
    const containerMap = new Map<any, any>();

    const iocContainer = {
        set: (token: any, value: any) => {
            containerMap.set(token, value);
        },
        get: (token: any) => containerMap.get(token),
        has: (token: any) => containerMap.has(token),
    };

    const config = {
        getOptional: <T>(path: string): T | undefined => configMap[path],
        get: <T>(path: string): T | undefined => configMap[path],
    };

    const logger = {
        info: (msg: string) => logs.push({level: "info", message: msg}),
        warn: (msg: string) => logs.push({level: "warn", message: msg}),
        error: (msg: string) => logs.push({level: "error", message: msg}),
        debug: (msg: string) => logs.push({level: "debug", message: msg}),
    };

    return {
        context: {
            logger,
            config,
            iocContainer,
        } as any,
        logs,
        containerMap,
        iocContainer,
    };
}

describe("@nodeboot/starter-backstage BackstageConfiguration Unit Tests", () => {
    test("registers BackstageIntegrationConfig, CatalogClient, and PluginDiscoveryService when integrations.backstage is configured", () => {
        const configInstance = new BackstageConfiguration();
        const {context, logs, iocContainer} = createMockBeansContext({
            "integrations.backstage": {
                apiUrl: "https://backstage.example.org/api",
                apiKey: "my-backstage-secret-key",
            },
        });

        configInstance.backstageCatalog(context);

        // 1. BackstageIntegrationConfig registration
        assert.equal(iocContainer.has(BackstageIntegrationConfig), true);
        const storedConfig = iocContainer.get(BackstageIntegrationConfig);
        assert.equal(storedConfig.apiUrl, "https://backstage.example.org/api");
        assert.equal(storedConfig.apiKey, "my-backstage-secret-key");

        // 2. CatalogClient registration
        assert.equal(iocContainer.has(CatalogClient), true);
        const storedClient = iocContainer.get(CatalogClient);
        assert.ok(storedClient);

        // 3. PluginDiscoveryService registration
        assert.equal(iocContainer.has(PluginDiscoveryService), true);
        const storedDiscovery = iocContainer.get(PluginDiscoveryService);
        assert.ok(storedDiscovery instanceof PluginDiscoveryService);

        // 4. Logging assertions
        assert.ok(logs.some(l => l.level === "info" && l.message.includes("Configuring Backstage Catalog Client")));
        assert.ok(logs.some(l => l.level === "info" && l.message.includes("Catalog client successfully configured")));
        assert.ok(
            logs.some(
                l => l.level === "info" && l.message.includes("Plugin endpoint discovery successfully configured"),
            ),
        );
    });

    test("logs a warning and does not register beans when integrations.backstage is omitted", () => {
        const configInstance = new BackstageConfiguration();
        const {context, logs, iocContainer} = createMockBeansContext({});

        configInstance.backstageCatalog(context);

        assert.equal(iocContainer.has(BackstageIntegrationConfig), false);
        assert.equal(iocContainer.has(CatalogClient), false);
        assert.equal(iocContainer.has(PluginDiscoveryService), false);

        assert.ok(logs.some(l => l.level === "info" && l.message.includes("Configuring Backstage Catalog Client")));
        assert.ok(
            logs.some(
                l =>
                    l.level === "warn" &&
                    l.message.includes(
                        'Backstage integration not configured. Please provide Backstage integration config ("apiUrl" and "apiKey")',
                    ),
            ),
        );
    });
});
