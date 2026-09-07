import "reflect-metadata";
import {describe, it, beforeEach, afterEach, mock} from "node:test";
import assert from "node:assert/strict";
import fs from "fs";

import {CoreInfoService} from "../src/services/CoreInfoService";
import {HealthService} from "../src/services/HealthService";
import {ApplicationContext} from "../src/ApplicationContext";
import {ApplicationLifecycleBridge} from "../src/services/ApplicationLifecycleBridge";

// NOTE: `Config` (services/Config.ts) and `LoggerService` (services/LoggerService.ts) are
// pure TypeScript `type`/`interface` declarations with zero runtime code (no classes,
// functions, or exported values) — there is nothing to unit test for them directly. They are
// exercised indirectly through the classes tested below.

function makeLogger() {
    return {
        error: mock.fn(),
        warn: mock.fn(),
        info: mock.fn(),
        debug: mock.fn(),
        child: mock.fn(),
    };
}

describe("services", () => {
    describe("CoreInfoService", () => {
        let originalServerType: string;

        beforeEach(() => {
            originalServerType = ApplicationContext.get().serverType;
            ApplicationContext.get().serverType = "express";
        });

        afterEach(() => {
            ApplicationContext.get().serverType = originalServerType;
        });

        it("getInfo() returns host/runtime/build/profile information", async () => {
            const logger = makeLogger();
            const service = new CoreInfoService(logger as any);

            const info = await service.getInfo();

            assert.equal(typeof info.host, "string");
            assert.equal(info.nodeVersion, process.versions.node);
            assert.ok(Array.isArray(info.loadAvg));
            assert.equal(typeof info.uptime, "number");
            assert.ok(Array.isArray(info.activeProfiles));
            assert.ok(info.build);
        });

        it("getMemory() returns heap/process memory statistics", async () => {
            const logger = makeLogger();
            const service = new CoreInfoService(logger as any);

            const memory = await service.getMemory();

            assert.equal(typeof memory.freeMem, "number");
            assert.equal(typeof memory.totalMem, "number");
            assert.ok(memory.memoryUsage);
            assert.ok(memory.heap);
            assert.ok(memory.heapSpace);
            assert.ok(memory.heapCodeStatistics);
        });

        it("getBuild() reads package.json and reports the current server type in uppercase", async () => {
            const logger = makeLogger();
            const service = new CoreInfoService(logger as any);

            const build = await service.getBuild();

            assert.ok(build);
            assert.equal(build!.name, "@nodeboot/context");
            assert.equal(build!.serverFramework, "EXPRESS");
        });

        it("getBuild() caches the result across repeated calls", async () => {
            const logger = makeLogger();
            const service = new CoreInfoService(logger as any);

            const first = await service.getBuild();
            // Change server type: a fresh read would pick this up, a cached read would not.
            ApplicationContext.get().serverType = "koa";
            const second = await service.getBuild();

            assert.equal(first, second);
            assert.equal(second!.serverFramework, "EXPRESS");
        });

        it("getInfo() reflects active profiles from the environment", async () => {
            const ENV_KEY = "NODE_BOOT_ACTIVE_PROFILES";
            const original = process.env[ENV_KEY];
            process.env[ENV_KEY] = "kubernetes,v2";

            try {
                const logger = makeLogger();
                const service = new CoreInfoService(logger as any);
                const info = await service.getInfo();

                assert.deepEqual(info.activeProfiles, ["kubernetes", "v2"]);
            } finally {
                if (original === undefined) delete process.env[ENV_KEY];
                else process.env[ENV_KEY] = original;
            }
        });

        it("logs a warning and returns undefined build info when package.json cannot be read", async () => {
            const logger = makeLogger();
            const service = new CoreInfoService(logger as any);

            const original = fs.readFileSync;
            (fs as any).readFileSync = () => {
                throw new Error("ENOENT: no such file");
            };

            try {
                const build = await service.getBuild();
                assert.equal(build, undefined);
                assert.equal(logger.warn.mock.callCount(), 1);
            } finally {
                (fs as any).readFileSync = original;
            }
        });
    });

    describe("HealthService", () => {
        // Minimal fake bridge exposing only the `.subscribe(event, listener)` surface that
        // HealthService relies on, with manual `.fire(event)` to simulate lifecycle events.
        class FakeLifecycleBridge {
            private listeners: Record<string, Array<() => void>> = {};

            subscribe(eventName: string, listener: () => void) {
                (this.listeners[eventName] ??= []).push(listener);
            }

            fire(eventName: string) {
                (this.listeners[eventName] ?? []).forEach(listener => listener());
            }
        }

        let originalFeatures: any;

        beforeEach(() => {
            originalFeatures = ApplicationContext.get().applicationFeatures;
        });

        afterEach(() => {
            ApplicationContext.get().applicationFeatures = originalFeatures;
        });

        it("getLiveness() always reports ok", async () => {
            const bridge = new FakeLifecycleBridge();
            const service = new HealthService(bridge as unknown as ApplicationLifecycleBridge);

            const liveness = await service.getLiveness();

            assert.equal(liveness.status, 200);
            assert.deepEqual(liveness.payload, {status: "ok"});
        });

        it("getReadiness() reports 503 before the application has started", async () => {
            const bridge = new FakeLifecycleBridge();
            const service = new HealthService(bridge as unknown as ApplicationLifecycleBridge);

            const readiness = await service.getReadiness();

            assert.equal(readiness.status, 503);
            assert.equal(readiness.payload.status, "error");
        });

        it("getReadiness() reports 200 after application.started when persistence is not active", async () => {
            ApplicationContext.get().applicationFeatures = {};

            const bridge = new FakeLifecycleBridge();
            const service = new HealthService(bridge as unknown as ApplicationLifecycleBridge);

            bridge.fire("application.started");

            const readiness = await service.getReadiness();
            assert.equal(readiness.status, 200);
        });

        it("getReadiness() stays 503 after application.started when persistence IS active (waits for persistence.started)", async () => {
            ApplicationContext.get().applicationFeatures = {persistence: true};

            const bridge = new FakeLifecycleBridge();
            const service = new HealthService(bridge as unknown as ApplicationLifecycleBridge);

            bridge.fire("application.started");

            let readiness = await service.getReadiness();
            assert.equal(readiness.status, 503);

            bridge.fire("persistence.started");

            readiness = await service.getReadiness();
            assert.equal(readiness.status, 200);
        });

        it("getReadiness() reports 503 again after application.stopped", async () => {
            ApplicationContext.get().applicationFeatures = {};

            const bridge = new FakeLifecycleBridge();
            const service = new HealthService(bridge as unknown as ApplicationLifecycleBridge);

            bridge.fire("application.started");
            assert.equal((await service.getReadiness()).status, 200);

            bridge.fire("application.stopped");
            assert.equal((await service.getReadiness()).status, 503);
        });
    });
});
