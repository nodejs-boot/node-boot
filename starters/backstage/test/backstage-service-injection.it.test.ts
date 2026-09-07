/**
 * Integration test verifying injection of Backstage beans
 * into an application @Service component.
 */
import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {CatalogClient} from "@backstage/catalog-client";
import {useNodeBoot} from "@nodeboot/node-test";
import {BackstageEnabledApp} from "./fixtures/BackstageEnabledApp";
import {SampleBackstageService} from "./fixtures/SampleBackstageService";
import {BackstageIntegrationConfig, PluginDiscoveryService} from "../src";

describe("@nodeboot/starter-backstage - Service Injection Integration", () => {
    useNodeBoot(BackstageEnabledApp as any, ({useConfig}) => {
        useConfig({
            app: {name: "starter-backstage-service-injection-test"},
            integrations: {
                backstage: {
                    apiUrl: "https://backstage.company.internal/api",
                    apiKey: "service-injection-api-key",
                },
            },
        });
    });

    test("injects CatalogClient, PluginDiscoveryService, and BackstageIntegrationConfig into a @Service class", async () => {
        const service = Container.get(SampleBackstageService);

        assert.ok(service, "SampleBackstageService should be resolvable from container");
        assert.ok(service.catalogClient, "catalogClient should be injected");
        assert.ok(service.discoveryService, "discoveryService should be injected");
        assert.ok(service.config, "config should be injected");

        assert.ok(service.catalogClient instanceof CatalogClient || typeof service.catalogClient === "object");
        assert.ok(service.discoveryService instanceof PluginDiscoveryService);
        assert.equal(typeof service.config, "object");
        assert.equal(service.config.apiKey, "service-injection-api-key");
        assert.equal(service.config.apiUrl, "https://backstage.company.internal/api");
        assert.ok(Container.has(BackstageIntegrationConfig));
    });

    test("performs operations and accesses configuration through injected service methods", async () => {
        const service = Container.get(SampleBackstageService);

        assert.equal(service.getConfiguredApiUrl(), "https://backstage.company.internal/api");
        assert.equal(service.getConfiguredApiKey(), "service-injection-api-key");

        const catalogUrl = await service.getPluginEndpoint("catalog");
        assert.equal(catalogUrl, "https://backstage.company.internal/api/catalog");

        const scaffolderUrl = await service.getPluginEndpoint("scaffolder");
        assert.equal(scaffolderUrl, "https://backstage.company.internal/api/scaffolder");

        const techdocsUrl = await service.getPluginEndpoint("techdocs");
        assert.equal(techdocsUrl, "https://backstage.company.internal/api/techdocs");
    });
});
