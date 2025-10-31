import {describe, expect, it} from "@jest/globals";
import EventEmitter from "node:events";
import {ApplicationLifecycleBridge} from "./ApplicationLifecycleBridge";
import {Config} from "./Config";
import {LifecycleType} from "../types";

// Minimal mock logger matching the subset used
const mockLogger = {
    info: jest.fn(),
    debug: jest.fn(),
} as any; // Winston logger subset

// Minimal mock config implementing required methods
const mockConfig: Config = {
    has: () => false,
    keys: () => [],
    get: () => ({} as any),
    getOptional: () => undefined,
    getConfig: () => mockConfig,
    getOptionalConfig: () => mockConfig,
    getConfigArray: () => [],
    getOptionalConfigArray: () => [],
    getNumber: () => 0,
    getOptionalNumber: () => 0,
    getBoolean: () => false,
    getOptionalBoolean: () => false,
    getString: () => "",
    getOptionalString: () => "",
    getStringArray: () => [],
    getOptionalStringArray: () => [],
};

const lifecycleEvent: LifecycleType = "application.started";

describe("ApplicationLifecycleBridge", () => {
    it("resolves awaitEvent after publish", async () => {
        const bridge = new ApplicationLifecycleBridge(mockLogger, mockConfig, new EventEmitter());
        setTimeout(() => bridge.publish(lifecycleEvent), 10);
        await expect(bridge.awaitEvent(lifecycleEvent, 100)).resolves.toBeUndefined();
    });

    it("resolves immediately if event already fired (awaitEvent)", async () => {
        const bridge = new ApplicationLifecycleBridge(mockLogger, mockConfig, new EventEmitter());
        await bridge.publish(lifecycleEvent);
        const start = Date.now();
        await bridge.awaitEvent(lifecycleEvent, 50);
        expect(Date.now() - start).toBeLessThan(10); // Should be near-immediate
    });

    it("invokes subscriber immediately if event already fired", () => {
        const bridge = new ApplicationLifecycleBridge(mockLogger, mockConfig, new EventEmitter());
        bridge.publish(lifecycleEvent);
        const listener = jest.fn();
        bridge.subscribe(lifecycleEvent, listener);
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it("subscribes normally before event fires", () => {
        const bridge = new ApplicationLifecycleBridge(mockLogger, mockConfig, new EventEmitter());
        const listener = jest.fn();
        bridge.subscribe(lifecycleEvent, listener);
        expect(listener).not.toHaveBeenCalled();
        bridge.publish(lifecycleEvent);
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it("rejects awaitEvent after timeout if not fired", async () => {
        const bridge = new ApplicationLifecycleBridge(mockLogger, mockConfig, new EventEmitter());
        await expect(bridge.awaitEvent(lifecycleEvent, 20)).rejects.toThrow(/Timeout/);
    });
});
