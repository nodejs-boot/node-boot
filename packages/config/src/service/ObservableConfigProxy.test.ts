import {ConfigReader} from "@backstage/config";
import {ConfigService} from "./ConfigService";
import {describe, expect, it, jest} from "@jest/globals";

describe("ObservableConfigProxy", () => {
    it("should notify subscribers", () => {
        const config = new ConfigService();

        const fn = jest.fn();
        const sub = config.subscribe(fn);
        expect(config.getOptionalNumber("x")).toBe(undefined);

        config.setConfig(new ConfigReader({}));
        expect(fn).toHaveBeenCalledTimes(1);
        expect(config.getOptionalNumber("x")).toBe(undefined);

        config.setConfig(new ConfigReader({x: 1}));
        expect(fn).toHaveBeenCalledTimes(2);
        expect(config.getOptionalNumber("x")).toBe(1);

        config.setConfig(new ConfigReader({x: 3}));
        expect(fn).toHaveBeenCalledTimes(3);
        sub.unsubscribe();
        expect(config.getOptionalNumber("x")).toBe(3);

        config.setConfig(new ConfigReader({x: 5}));
        expect(fn).toHaveBeenCalledTimes(3);
        expect(config.getOptionalNumber("x")).toBe(5);
    });

    it("should forward subscriptions", () => {
        const config1 = new ConfigService();

        const fn1 = jest.fn();
        const fn2 = jest.fn();
        const fn3 = jest.fn();
        const config2 = config1.getConfig("a");
        const config3 = config2.getConfig("b");
        const sub1 = config1.subscribe(fn1);
        const sub2 = config2.subscribe!(fn2);
        const sub3 = config3.subscribe!(fn3);
        expect(config1.getOptionalNumber("x")).toBe(undefined);
        expect(config2.getOptionalNumber("x")).toBe(undefined);
        expect(config3.getOptionalNumber("x")).toBe(undefined);

        config1.setConfig(new ConfigReader({}));
        expect(fn1).toHaveBeenCalledTimes(1);
        expect(fn2).toHaveBeenCalledTimes(1);
        expect(fn3).toHaveBeenCalledTimes(1);
        expect(config1.getOptionalNumber("x")).toBe(undefined);
        expect(config2.getOptionalNumber("x")).toBe(undefined);
        expect(config3.getOptionalNumber("x")).toBe(undefined);

        config1.setConfig(new ConfigReader({x: 1, a: {x: 2, b: {x: 3}}}));
        expect(fn1).toHaveBeenCalledTimes(2);
        expect(fn2).toHaveBeenCalledTimes(2);
        expect(fn3).toHaveBeenCalledTimes(2);
        expect(config1.getNumber("x")).toBe(1);
        expect(config2.getNumber("x")).toBe(2);
        expect(config3.getNumber("x")).toBe(3);

        sub1.unsubscribe();
        sub2.unsubscribe();
        sub3.unsubscribe();

        config1.setConfig(new ConfigReader({x: 4, a: {x: 5, b: {x: 6}}}));
        expect(fn1).toHaveBeenCalledTimes(2);
        expect(fn2).toHaveBeenCalledTimes(2);
        expect(fn3).toHaveBeenCalledTimes(2);
        expect(config1.getNumber("x")).toBe(4);
        expect(config2.getNumber("x")).toBe(5);
        expect(config3.getNumber("x")).toBe(6);

        config1.setConfig(new ConfigReader({}));
        expect(() => config1.getNumber("x")).toThrow(
            "Missing required config value at 'x'",
        );
        expect(() => config2.getNumber("x")).toThrow(
            "Missing required config value at 'a'",
        );
        expect(() => config3.getNumber("x")).toThrow(
            "Missing required config value at 'a'",
        );

        config1.setConfig(new ConfigReader({x: "s", a: {x: "s", b: {x: "s"}}}));
        expect(() => config1.getNumber("x")).toThrow(
            "Unable to convert config value for key 'x' in 'mock-config' to a number",
        );
        expect(() => config2.getNumber("x")).toThrow(
            "Unable to convert config value for key 'a.x' in 'mock-config' to a number",
        );
        expect(() => config3.getNumber("x")).toThrow(
            "Unable to convert config value for key 'a.b.x' in 'mock-config' to a number",
        );
    });

    it("should make sub configs available as expected", () => {
        const config = new ConfigService();

        config.setConfig(new ConfigReader({a: {x: 1}}));

        expect(config.getConfig("a")).toBeDefined();
        expect(config.getConfig("a").getNumber("x")).toBe(1);
        expect(config.getConfig("a").getOptionalNumber("x")).toBe(1);
        expect(config.getOptionalConfig("a")?.getNumber("x")).toBe(1);
        expect(config.getOptionalConfig("a")?.getOptionalNumber("x")).toBe(1);
        expect(config.getOptionalConfig("b")).toBeUndefined();
        expect(() => config.getConfig("b")).toBeDefined();
        expect(() => config.getConfig("b").get()).toThrow();
    });
});
