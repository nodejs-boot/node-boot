import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {ConfigReader} from "@backstage/config";
import {ConfigService} from "./ConfigService";

describe("ObservableConfigProxy", () => {
    it("should notify subscribers", () => {
        const config = new ConfigService();

        let callCount = 0;
        const fn = () => {
            callCount++;
        };
        const sub = config.subscribe(fn);
        assert.equal(config.getOptionalNumber("x"), undefined);

        config.setConfig(new ConfigReader({}));
        assert.equal(callCount, 1);
        assert.equal(config.getOptionalNumber("x"), undefined);

        config.setConfig(new ConfigReader({x: 1}));
        assert.equal(callCount, 2);
        assert.equal(config.getOptionalNumber("x"), 1);

        config.setConfig(new ConfigReader({x: 3}));
        assert.equal(callCount, 3);
        sub.unsubscribe();
        assert.equal(config.getOptionalNumber("x"), 3);

        config.setConfig(new ConfigReader({x: 5}));
        assert.equal(callCount, 3);
        assert.equal(config.getOptionalNumber("x"), 5);
    });

    it("should forward subscriptions", () => {
        const config1 = new ConfigService();

        let callCount1 = 0;
        let callCount2 = 0;
        let callCount3 = 0;
        const fn1 = () => {
            callCount1++;
        };
        const fn2 = () => {
            callCount2++;
        };
        const fn3 = () => {
            callCount3++;
        };
        const config2 = config1.getConfig("a");
        const config3 = config2.getConfig("b");
        const sub1 = config1.subscribe(fn1);
        const sub2 = config2.subscribe!(fn2);
        const sub3 = config3.subscribe!(fn3);
        assert.equal(config1.getOptionalNumber("x"), undefined);
        assert.equal(config2.getOptionalNumber("x"), undefined);
        assert.equal(config3.getOptionalNumber("x"), undefined);

        config1.setConfig(new ConfigReader({}));
        assert.equal(callCount1, 1);
        assert.equal(callCount2, 1);
        assert.equal(callCount3, 1);
        assert.equal(config1.getOptionalNumber("x"), undefined);
        assert.equal(config2.getOptionalNumber("x"), undefined);
        assert.equal(config3.getOptionalNumber("x"), undefined);

        config1.setConfig(new ConfigReader({x: 1, a: {x: 2, b: {x: 3}}}));
        assert.equal(callCount1, 2);
        assert.equal(callCount2, 2);
        assert.equal(callCount3, 2);
        assert.equal(config1.getNumber("x"), 1);
        assert.equal(config2.getNumber("x"), 2);
        assert.equal(config3.getNumber("x"), 3);

        sub1.unsubscribe();
        sub2.unsubscribe();
        sub3.unsubscribe();

        config1.setConfig(new ConfigReader({x: 4, a: {x: 5, b: {x: 6}}}));
        assert.equal(callCount1, 2);
        assert.equal(callCount2, 2);
        assert.equal(callCount3, 2);
        assert.equal(config1.getNumber("x"), 4);
        assert.equal(config2.getNumber("x"), 5);
        assert.equal(config3.getNumber("x"), 6);

        config1.setConfig(new ConfigReader({}));
        assert.throws(() => config1.getNumber("x"), /Missing required config value at 'x'/);
        assert.throws(() => config2.getNumber("x"), /Missing required config value at 'a'/);
        assert.throws(() => config3.getNumber("x"), /Missing required config value at 'a'/);

        config1.setConfig(new ConfigReader({x: "s", a: {x: "s", b: {x: "s"}}}));
        assert.throws(
            () => config1.getNumber("x"),
            /Unable to convert config value for key 'x' in 'mock-config' to a number/,
        );
        assert.throws(
            () => config2.getNumber("x"),
            /Unable to convert config value for key 'a.x' in 'mock-config' to a number/,
        );
        assert.throws(
            () => config3.getNumber("x"),
            /Unable to convert config value for key 'a.b.x' in 'mock-config' to a number/,
        );
    });

    it("should make sub configs available as expected", () => {
        const config = new ConfigService();

        config.setConfig(new ConfigReader({a: {x: 1}}));

        assert.ok(config.getConfig("a"), "config.getConfig('a') should be defined");
        assert.equal(config.getConfig("a").getNumber("x"), 1);
        assert.equal(config.getConfig("a").getOptionalNumber("x"), 1);
        assert.equal(config.getOptionalConfig("a")?.getNumber("x"), 1);
        assert.equal(config.getOptionalConfig("a")?.getOptionalNumber("x"), 1);
        assert.equal(config.getOptionalConfig("b"), undefined);
        assert.ok(config.getConfig("b"), "config.getConfig('b') should be defined");
        assert.throws(() => config.getConfig("b").get());
    });
});
