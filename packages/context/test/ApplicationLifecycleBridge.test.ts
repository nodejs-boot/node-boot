import "reflect-metadata";
import {describe, it, mock, beforeEach, afterEach} from "node:test";
import assert from "node:assert/strict";
import EventEmitter from "node:events";

import {ApplicationLifecycleBridge} from "../src/services/ApplicationLifecycleBridge";
import {Config} from "../src/services/Config";
import {LifecycleType} from "../src/types";
import {ApplicationContext} from "../src/ApplicationContext";
import {ApplicationFeatureAdapter} from "../src/adapters";

// Minimal mock logger matching the subset used
const mockLogger = {
    info: mock.fn(),
    debug: mock.fn(),
    warn: mock.fn(),
    error: mock.fn(),
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

    // ---------------------------------------------------------------------
    // Extra coverage: hasFired / getEventBus / getListenerCount / cleanup
    // ---------------------------------------------------------------------

    describe("hasFired", () => {
        it("returns false before publish and true after publish", async () => {
            const bridge = new ApplicationLifecycleBridge(mockLogger, mockConfig, new EventEmitter());

            assert.equal(bridge.hasFired(lifecycleEvent), false);

            await bridge.publish(lifecycleEvent);

            assert.equal(bridge.hasFired(lifecycleEvent), true);
        });

        it("tracks distinct lifecycle events independently", async () => {
            const bridge = new ApplicationLifecycleBridge(mockLogger, mockConfig, new EventEmitter());

            await bridge.publish("application.initialized");

            assert.equal(bridge.hasFired("application.initialized"), true);
            assert.equal(bridge.hasFired("application.started"), false);
            assert.equal(bridge.hasFired("persistence.started"), false);
        });
    });

    describe("getEventBus", () => {
        it("returns the exact EventEmitter instance passed to the constructor", () => {
            const eventBus = new EventEmitter();
            const bridge = new ApplicationLifecycleBridge(mockLogger, mockConfig, eventBus);

            assert.equal(bridge.getEventBus(), eventBus);
        });

        it("defaults to a new EventEmitter when none is provided", () => {
            const bridge = new ApplicationLifecycleBridge(mockLogger, mockConfig);

            assert.ok(bridge.getEventBus() instanceof EventEmitter);
        });
    });

    describe("getListenerCount", () => {
        it("reflects the number of active listeners across all events", () => {
            const eventBus = new EventEmitter();
            const bridge = new ApplicationLifecycleBridge(mockLogger, mockConfig, eventBus);

            assert.equal(bridge.getListenerCount(), 0);

            bridge.subscribe("application.initialized", () => undefined);
            assert.equal(bridge.getListenerCount(), 1);

            bridge.subscribe("application.started", () => undefined);
            assert.equal(bridge.getListenerCount(), 2);
        });

        it("decreases after a `once` listener is consumed via publish", () => {
            const eventBus = new EventEmitter();
            const bridge = new ApplicationLifecycleBridge(mockLogger, mockConfig, eventBus);

            bridge.subscribe(lifecycleEvent, () => undefined);
            assert.equal(bridge.getListenerCount(), 1);

            bridge.publish(lifecycleEvent);
            assert.equal(bridge.getListenerCount(), 0);
        });
    });

    describe("cleanup", () => {
        it("removes all listeners and clears fired events", async () => {
            const eventBus = new EventEmitter();
            const bridge = new ApplicationLifecycleBridge(mockLogger, mockConfig, eventBus);

            const listener = mock.fn();
            bridge.subscribe("application.started", listener);
            await bridge.publish("application.initialized");

            assert.equal(bridge.hasFired("application.initialized"), true);
            assert.equal(bridge.getListenerCount(), 1);

            bridge.cleanup();

            assert.equal(bridge.getListenerCount(), 0);
            assert.equal(bridge.hasFired("application.initialized"), false);

            // A late subscription to a previously-fired event is no longer treated as fired.
            const lateListener = mock.fn();
            bridge.subscribe("application.initialized", lateListener);
            assert.equal(lateListener.mock.callCount(), 0);
        });

        it("logs a debug message during cleanup", () => {
            const logger = {info: mock.fn(), debug: mock.fn(), warn: mock.fn(), error: mock.fn()} as any;
            const bridge = new ApplicationLifecycleBridge(logger, mockConfig, new EventEmitter());

            bridge.cleanup();

            assert.equal(logger.debug.mock.callCount(), 1);
        });
    });

    // ---------------------------------------------------------------------
    // Extra coverage: listen() + applyLifecycle sequential adapter binding
    // ---------------------------------------------------------------------

    describe("listen() + applyLifecycle integration", () => {
        // Snapshot fields of the ApplicationContext singleton that this suite mutates,
        // so other test files sharing the process are not affected.
        let originalDiOptions: any;
        let originalAdapters: ApplicationFeatureAdapter[];
        let originalFeatures: any;

        beforeEach(() => {
            const context = ApplicationContext.get();
            originalDiOptions = context.diOptions;
            originalAdapters = context.applicationFeatureAdapters;
            originalFeatures = context.applicationFeatures;
        });

        afterEach(() => {
            const context = ApplicationContext.get();
            context.diOptions = originalDiOptions;
            context.applicationFeatureAdapters = originalAdapters;
            context.applicationFeatures = originalFeatures;
        });

        function makeAdapter(callOrder: string[], label: string, shouldFail = false): ApplicationFeatureAdapter {
            return {
                bind: async () => {
                    if (shouldFail) {
                        callOrder.push(`${label}:fail`);
                        throw new Error(`${label} failed`);
                    }
                    callOrder.push(label);
                },
            };
        }

        it("binds adapters for application.initialized (default lifecycle) when published", async () => {
            const context = ApplicationContext.get();
            const callOrder: string[] = [];
            context.diOptions = {iocContainer: {} as any};
            context.applicationFeatureAdapters = [makeAdapter(callOrder, "init-adapter")];
            context.applicationFeatures = {persistence: true};

            const bridge = new ApplicationLifecycleBridge(mockLogger, mockConfig, new EventEmitter());
            await bridge.listen();

            await bridge.publish("application.initialized");

            // Binding is asynchronous (queued); wait for it to settle.
            await new Promise(resolve => setImmediate(resolve));
            await new Promise(resolve => setImmediate(resolve));

            assert.deepEqual(callOrder, ["init-adapter"]);
        });

        it("auto-publishes persistence.started after application.started when persistence feature is absent", async () => {
            const context = ApplicationContext.get();
            const callOrder: string[] = [];
            context.diOptions = {iocContainer: {} as any};
            context.applicationFeatureAdapters = [];
            context.applicationFeatures = {}; // no persistence feature registered

            const bridge = new ApplicationLifecycleBridge(mockLogger, mockConfig, new EventEmitter());
            await bridge.listen();

            await bridge.publish("application.started");

            await new Promise(resolve => setImmediate(resolve));
            await new Promise(resolve => setImmediate(resolve));

            assert.equal(bridge.hasFired("persistence.started"), true);
            void callOrder;
        });

        it("does NOT auto-publish persistence.started when persistence feature is present", async () => {
            const context = ApplicationContext.get();
            context.diOptions = {iocContainer: {} as any};
            context.applicationFeatureAdapters = [];
            context.applicationFeatures = {persistence: true};

            const bridge = new ApplicationLifecycleBridge(mockLogger, mockConfig, new EventEmitter());
            await bridge.listen();

            await bridge.publish("application.started");

            await new Promise(resolve => setImmediate(resolve));
            await new Promise(resolve => setImmediate(resolve));

            assert.equal(bridge.hasFired("persistence.started"), false);
        });

        it("publishes application.adapters.bound after persistence.started adapters are applied", async () => {
            const context = ApplicationContext.get();
            context.diOptions = {iocContainer: {} as any};
            context.applicationFeatureAdapters = [];
            context.applicationFeatures = {persistence: true};

            const bridge = new ApplicationLifecycleBridge(mockLogger, mockConfig, new EventEmitter());
            await bridge.listen();

            await bridge.publish("persistence.started");

            // Wait for the queue to process persistence.started and then application.adapters.bound
            for (let i = 0; i < 5; i++) {
                await new Promise(resolve => setImmediate(resolve));
            }

            assert.equal(bridge.hasFired("application.adapters.bound"), true);
        });

        it("continues binding remaining adapters when one adapter fails", async () => {
            const context = ApplicationContext.get();
            const callOrder: string[] = [];
            context.diOptions = {iocContainer: {} as any};
            context.applicationFeatureAdapters = [
                makeAdapter(callOrder, "first", true),
                makeAdapter(callOrder, "second"),
            ];
            context.applicationFeatures = {persistence: true};

            const bridge = new ApplicationLifecycleBridge(mockLogger, mockConfig, new EventEmitter());

            await bridge.applyLifecycle("application.initialized");

            assert.deepEqual(callOrder, ["first:fail", "second"]);
        });

        it("does nothing when the IoC container is not available", async () => {
            const context = ApplicationContext.get();
            context.diOptions = undefined;
            context.applicationFeatureAdapters = [];
            context.applicationFeatures = {};

            const bridge = new ApplicationLifecycleBridge(mockLogger, mockConfig, new EventEmitter());

            // Should resolve without throwing even though there's no container.
            await assert.doesNotReject(bridge.applyLifecycle("application.initialized"));
        });
    });
});
