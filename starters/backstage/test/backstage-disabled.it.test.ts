/**
 * Auto-configuration integration test for `@nodeboot/starter-backstage` - negative case.
 *
 * Same `BackstageEnabledApp` fixture (still applies `@EnableBackstage()`), but boots without any
 * `integrations.backstage` config - `BackstageConfiguration`'s `@Bean` warns and skips registration
 * instead of throwing.
 */
import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {CatalogClient} from "@backstage/catalog-client";
import {useNodeBoot} from "@nodeboot/node-test";
import {BackstageEnabledApp} from "./fixtures/BackstageEnabledApp";
import {BackstageIntegrationConfig, PluginDiscoveryService} from "../src";

describe("@nodeboot/starter-backstage auto-configuration - integrations.backstage not configured", () => {
    useNodeBoot(BackstageEnabledApp as any, ({useConfig}) => {
        useConfig({app: {name: "starter-backstage-disabled-test"}});
    });

    test("never registers a CatalogClient, PluginDiscoveryService, or BackstageIntegrationConfig in the IoC container", () => {
        assert.equal(Container.has(CatalogClient), false);
        assert.equal(Container.has(PluginDiscoveryService), false);
        assert.equal(Container.has(BackstageIntegrationConfig), false);
    });
});
