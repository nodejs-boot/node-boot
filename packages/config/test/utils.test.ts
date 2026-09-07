import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {loadConfig} from "../src/utils";
import {ConfigService} from "../src/service/ConfigService";

describe("loadConfig", () => {
    it("returns a ConfigService instance", () => {
        const config = loadConfig({});
        assert.ok(config instanceof ConfigService);
    });

    it("exposes the given data through the returned ConfigService", () => {
        const config = loadConfig({
            app: {
                name: "my-app",
                port: 3000,
                debug: true,
                tags: ["a", "b"],
            },
        });

        assert.equal(config.getString("app.name"), "my-app");
        assert.equal(config.getNumber("app.port"), 3000);
        assert.equal(config.getBoolean("app.debug"), true);
        assert.deepEqual(config.getStringArray("app.tags"), ["a", "b"]);
    });

    it("supports nested sub-config access", () => {
        const config = loadConfig({a: {b: {c: "value"}}});

        const sub = config.getConfig("a").getConfig("b");
        assert.equal(sub.getString("c"), "value");
    });

    it("returns an empty config when no data is given", () => {
        const config = loadConfig({});
        assert.equal(config.has("anything"), false);
        assert.deepEqual(config.keys(), []);
    });

    it("throws when accessing a required key missing from the loaded data", () => {
        const config = loadConfig({});
        assert.throws(() => config.getString("missing"), /Missing required config value at 'missing'/);
    });
});
