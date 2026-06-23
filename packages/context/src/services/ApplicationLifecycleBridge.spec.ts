import {describe, it, mock} from "node:test";
import assert from "node:assert/strict";
import EventEmitter from "node:events";

import {ApplicationLifecycleBridge} from "./ApplicationLifecycleBridge";
import {Config} from "./Config";
import {LifecycleType} from "../types";

// Minimal mock logger matching the subset used
const mockLogger = {
    info: mock.fn(),
    debug: mock.fn(),
} as any;

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

        await assert.doesNotReject(bridge.awaitEvent(lifecycleEvent, 100));
    });

    it("resolves immediately if event already fired (awaitEvent)", async () => {
        const bridge = new ApplicationLifecycleBridge(mockLogger, mockConfig, new EventEmitter());

        await bridge.publish(lifecycleEvent);

        const start = Date.now();
        await bridge.awaitEvent(lifecycleEvent, 50);

        assert.ok(Date.now() - start < 10);
    });

    it("invokes subscriber immediately if event already fired", () => {
        const bridge = new ApplicationLifecycleBridge(mockLogger, mockConfig, new EventEmitter());

        bridge.publish(lifecycleEvent);

        const listener = mock.fn();

        bridge.subscribe(lifecycleEvent, listener);

        assert.equal(listener.mock.callCount(), 1);
    });

    it("subscribes normally before event fires", () => {
        const bridge = new ApplicationLifecycleBridge(mockLogger, mockConfig, new EventEmitter());

        const listener = mock.fn();

        bridge.subscribe(lifecycleEvent, listener);

        assert.equal(listener.mock.callCount(), 0);

        bridge.publish(lifecycleEvent);

        assert.equal(listener.mock.callCount(), 1);
    });

    it("rejects awaitEvent after timeout if not fired", async () => {
        const bridge = new ApplicationLifecycleBridge(mockLogger, mockConfig, new EventEmitter());

        await assert.rejects(bridge.awaitEvent(lifecycleEvent, 20), /Timeout/);
    });
});
