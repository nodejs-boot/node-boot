/**
 * Auto-configuration integration test for `@nodeboot/starter-backstage` - positive case.
 *
 * See `backstage-disabled.it.test.ts` for the negative counterpart (no `integrations.backstage`
 * config, same app).
 */
import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {CatalogClient} from "@backstage/catalog-client";
import {useNodeBoot} from "@nodeboot/node-test";
import {BackstageEnabledApp} from "./fixtures/BackstageEnabledApp";
import {BackstageIntegrationConfig, PluginDiscoveryService} from "../src";

describe("@nodeboot/starter-backstage auto-configuration - integrations.backstage configured", () => {
    // `@nodeboot/node-test` resolves `NodeBootApp` against its own (published) `@nodeboot/core`
    // dependency, which TypeScript treats as nominally distinct from this monorepo's workspace
    // package of the same name - cast at the boundary rather than relaxing the fixture's typing.
    useNodeBoot(BackstageEnabledApp as any, ({useConfig}) => {
        useConfig({
            app: {name: "starter-backstage-enabled-test"},
            integrations: {
                backstage: {
                    apiUrl: "https://backstage.example.com/api",
                    apiKey: "test-key",
                },
            },
        });
    });

    test("registers CatalogClient, PluginDiscoveryService, and BackstageIntegrationConfig in IoC container", async () => {
        // Retrieve straight from `typedi`'s Container
        assert.equal(Container.has(CatalogClient), true);
        assert.equal(Container.has(PluginDiscoveryService), true);
        assert.equal(Container.has(BackstageIntegrationConfig), true);

        const config = Container.get(BackstageIntegrationConfig);
        assert.ok(config);
        assert.equal(config.apiUrl, "https://backstage.example.com/api");
        assert.equal(config.apiKey, "test-key");

        const catalogClient = Container.get(CatalogClient);
        assert.ok(catalogClient);

        const discovery = Container.get(PluginDiscoveryService);
        assert.ok(discovery);
        assert.equal(await discovery.getPluginUrl("catalog"), "https://backstage.example.com/api/catalog");
        assert.equal(await discovery.getPluginUrl("scaffolder"), "https://backstage.example.com/api/scaffolder");
        assert.equal(await discovery.getPluginUrl("techdocs"), "https://backstage.example.com/api/techdocs");
    });
});
