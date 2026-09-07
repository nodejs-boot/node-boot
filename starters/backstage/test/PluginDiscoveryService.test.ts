import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {PluginDiscoveryService} from "../src";

describe("@nodeboot/starter-backstage PluginDiscoveryService Unit Tests", () => {
    test("returns correct plugin URLs for given plugin IDs", async () => {
        const discovery = new PluginDiscoveryService("https://backstage.example.com/api");

        const catalogUrl = await discovery.getPluginUrl("catalog");
        assert.equal(catalogUrl, "https://backstage.example.com/api/catalog");

        const scaffolderUrl = await discovery.getPluginUrl("scaffolder");
        assert.equal(scaffolderUrl, "https://backstage.example.com/api/scaffolder");

        const techdocsUrl = await discovery.getPluginUrl("techdocs");
        assert.equal(techdocsUrl, "https://backstage.example.com/api/techdocs");

        const searchUrl = await discovery.getPluginUrl("search");
        assert.equal(searchUrl, "https://backstage.example.com/api/search");
    });
});
