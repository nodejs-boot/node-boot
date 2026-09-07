import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {ConfigReader} from "@backstage/config";
import {ConfigService} from "../src/service/ConfigService";

function configWith(data: object): ConfigService {
    const config = new ConfigService();
    config.setConfig(new ConfigReader(data));
    return config;
}

describe("ConfigService getter matrix", () => {
    describe("getString / getOptionalString", () => {
        it("returns the value when present", () => {
            const config = configWith({a: "hello"});
            assert.equal(config.getString("a"), "hello");
            assert.equal(config.getOptionalString("a"), "hello");
        });

        it("throws for a required missing key", () => {
            const config = configWith({});
            assert.throws(() => config.getString("a"), /Missing required config value at 'a'/);
        });

        it("returns undefined for an optional missing key", () => {
            const config = configWith({});
            assert.equal(config.getOptionalString("a"), undefined);
        });

        it("throws when the value has the wrong type", () => {
            const config = configWith({a: {nested: true}});
            assert.throws(
                () => config.getString("a"),
                /Invalid type in config for key 'a' in 'mock-config', got object, wanted string/,
            );
        });
    });

    describe("getBoolean / getOptionalBoolean", () => {
        it("returns the value when present", () => {
            const config = configWith({a: true, b: "false"});
            assert.equal(config.getBoolean("a"), true);
            assert.equal(config.getBoolean("b"), false);
            assert.equal(config.getOptionalBoolean("a"), true);
        });

        it("throws for a required missing key", () => {
            const config = configWith({});
            assert.throws(() => config.getBoolean("a"), /Missing required config value at 'a'/);
        });

        it("returns undefined for an optional missing key", () => {
            const config = configWith({});
            assert.equal(config.getOptionalBoolean("a"), undefined);
        });

        it("throws when the string value cannot be coerced to a boolean", () => {
            const config = configWith({a: "not-a-boolean"});
            assert.throws(
                () => config.getBoolean("a"),
                /Unable to convert config value for key 'a' in 'mock-config' to a boolean/,
            );
        });
    });

    describe("getNumber / getOptionalNumber", () => {
        it("returns the value when present", () => {
            const config = configWith({a: 42, b: "7"});
            assert.equal(config.getNumber("a"), 42);
            assert.equal(config.getNumber("b"), 7);
            assert.equal(config.getOptionalNumber("a"), 42);
        });

        it("throws for a required missing key", () => {
            const config = configWith({});
            assert.throws(() => config.getNumber("a"), /Missing required config value at 'a'/);
        });

        it("returns undefined for an optional missing key", () => {
            const config = configWith({});
            assert.equal(config.getOptionalNumber("a"), undefined);
        });

        it("throws when the value cannot be converted to a number", () => {
            const config = configWith({a: "not-a-number"});
            assert.throws(
                () => config.getNumber("a"),
                /Unable to convert config value for key 'a' in 'mock-config' to a number/,
            );
        });
    });

    describe("getStringArray / getOptionalStringArray", () => {
        it("returns the value when present", () => {
            const config = configWith({a: ["x", "y"]});
            assert.deepEqual(config.getStringArray("a"), ["x", "y"]);
            assert.deepEqual(config.getOptionalStringArray("a"), ["x", "y"]);
        });

        it("throws for a required missing key", () => {
            const config = configWith({});
            assert.throws(() => config.getStringArray("a"), /Missing required config value at 'a'/);
        });

        it("returns undefined for an optional missing key", () => {
            const config = configWith({});
            assert.equal(config.getOptionalStringArray("a"), undefined);
        });

        it("throws when the value is not an array", () => {
            const config = configWith({a: "not-an-array"});
            assert.throws(
                () => config.getStringArray("a"),
                /Invalid type in config for key 'a' in 'mock-config', got string, wanted string-array/,
            );
        });

        it("throws when an array element is not a string", () => {
            const config = configWith({a: ["x", 1]});
            assert.throws(
                () => config.getStringArray("a"),
                /Invalid type in config for key 'a\[1]' in 'mock-config', got number, wanted string-array/,
            );
        });
    });

    describe("getConfigArray / getOptionalConfigArray", () => {
        it("returns sub configs for each array element", () => {
            const config = configWith({a: [{x: 1}, {x: 2}]});
            const array = config.getConfigArray("a");
            assert.equal(array.length, 2);
            assert.equal(array[0]?.getNumber("x"), 1);
            assert.equal(array[1]?.getNumber("x"), 2);
        });

        it("throws for a required missing key", () => {
            const config = configWith({});
            assert.throws(() => config.getConfigArray("a"), /Missing required config value at 'a'/);
        });

        it("returns undefined for an optional missing key", () => {
            const config = configWith({});
            assert.equal(config.getOptionalConfigArray("a"), undefined);
        });
    });

    describe("has / keys", () => {
        it("reports presence of top-level and nested keys", () => {
            const config = configWith({a: 1, nested: {b: 2}});
            assert.equal(config.has("a"), true);
            assert.equal(config.has("nested.b"), true);
            assert.equal(config.has("missing"), false);
        });

        it("lists the top-level keys", () => {
            const config = configWith({a: 1, b: 2});
            assert.deepEqual(config.keys().sort(), ["a", "b"]);
        });

        it("returns false/empty when the underlying config has not been set on a sub config", () => {
            const config = new ConfigService();
            const sub = config.getConfig("missing");
            assert.equal(sub.has("anything"), false);
            assert.deepEqual(sub.keys(), []);
        });
    });

    describe("get / getOptional", () => {
        it("returns the raw value for a present key", () => {
            const config = configWith({a: {b: 1}});
            assert.deepEqual(config.get("a"), {b: 1});
            assert.deepEqual(config.getOptional("a"), {b: 1});
        });

        it("throws for a required missing key", () => {
            const config = configWith({});
            assert.throws(() => config.get("a"), /Missing required config value at 'a'/);
        });

        it("returns undefined for an optional missing key", () => {
            const config = configWith({});
            assert.equal(config.getOptional("a"), undefined);
        });
    });
});
