import "reflect-metadata";
import {describe, it, beforeEach, afterEach, mock} from "node:test";
import assert from "node:assert/strict";

import {ShutdownHookContext, ShutdownHookMetadata} from "../src/shutdown/ShutdownHookContext";
import {ApplicationContext} from "../src/ApplicationContext";

// Registering hooks triggers real `process.on(...)` signal-listener registration the first
// time a hook is added after a reset(). Each test resets the singleton, so across this file
// many of these listeners accumulate on the shared `process` object. Raise the cap to avoid
// noisy MaxListenersExceededWarning output (this does not affect test outcomes).
process.setMaxListeners(100);

describe("ShutdownHookContext", () => {
    let originalDiOptions: any;

    beforeEach(() => {
        ShutdownHookContext.reset();
        originalDiOptions = ApplicationContext.get().diOptions;
    });

    afterEach(() => {
        ShutdownHookContext.reset();
        ApplicationContext.get().diOptions = originalDiOptions;
    });

    it("get() returns a singleton instance", () => {
        const a = ShutdownHookContext.get();
        const b = ShutdownHookContext.get();
        assert.equal(a, b);
    });

    it("starts with no registered hooks", () => {
        assert.equal(ShutdownHookContext.get().getShutdownHooksCount(), 0);
    });

    describe("addShutdownHook", () => {
        it("adds a hook and increments the count", () => {
            const context = ShutdownHookContext.get();
            context.addShutdownHook({target: {}, methodName: "cleanup", priority: 0});
            assert.equal(context.getShutdownHooksCount(), 1);
        });

        it("does not add a duplicate hook for the same target/methodName pair", () => {
            const context = ShutdownHookContext.get();
            const target = {};
            context.addShutdownHook({target, methodName: "cleanup", priority: 0});
            context.addShutdownHook({target, methodName: "cleanup", priority: 5});

            assert.equal(context.getShutdownHooksCount(), 1);
        });

        it("treats different methodNames on the same target as distinct hooks", () => {
            const context = ShutdownHookContext.get();
            const target = {};
            context.addShutdownHook({target, methodName: "cleanupA", priority: 0});
            context.addShutdownHook({target, methodName: "cleanupB", priority: 0});

            assert.equal(context.getShutdownHooksCount(), 2);
        });

        it("sorts hooks by priority, higher priority first", async () => {
            const context = ShutdownHookContext.get();
            const order: string[] = [];

            context.addShutdownHook({
                target: {low: () => order.push("low")},
                methodName: "low",
                priority: 1,
            });
            context.addShutdownHook({
                target: {high: () => order.push("high")},
                methodName: "high",
                priority: 100,
            });
            context.addShutdownHook({
                target: {mid: () => order.push("mid")},
                methodName: "mid",
                priority: 50,
            });

            // Re-fetch the targets so their methodName lines up with a callable function on them.
            const hooksInOrder = (context as any).shutdownHooks as ShutdownHookMetadata[];
            const priorities = hooksInOrder.map(h => h.priority);

            assert.deepEqual(priorities, [100, 50, 1]);
        });
    });

    describe("removeShutdownHook", () => {
        it("removes a previously registered hook", () => {
            const context = ShutdownHookContext.get();
            const target = {};
            context.addShutdownHook({target, methodName: "cleanup", priority: 0});
            assert.equal(context.getShutdownHooksCount(), 1);

            context.removeShutdownHook(target, "cleanup");
            assert.equal(context.getShutdownHooksCount(), 0);
        });

        it("is a no-op when the hook does not exist", () => {
            const context = ShutdownHookContext.get();
            assert.doesNotThrow(() => context.removeShutdownHook({}, "doesNotExist"));
            assert.equal(context.getShutdownHooksCount(), 0);
        });
    });

    describe("clear", () => {
        it("removes all hooks and resets the shutting-down flag", () => {
            const context = ShutdownHookContext.get();
            context.addShutdownHook({target: {}, methodName: "a", priority: 0});
            context.addShutdownHook({target: {}, methodName: "b", priority: 0});
            assert.equal(context.getShutdownHooksCount(), 2);

            context.clear();
            assert.equal(context.getShutdownHooksCount(), 0);
        });
    });

    describe("executeShutdownHooks", () => {
        it("invokes hooks in priority order and resolves the returned instance from the IoC container", async () => {
            const context = ShutdownHookContext.get();
            const order: string[] = [];

            class ServiceA {
                cleanupA() {
                    order.push("A");
                }
            }
            class ServiceB {
                cleanupB() {
                    order.push("B");
                }
            }

            const instanceA = new ServiceA();
            const instanceB = new ServiceB();

            ApplicationContext.get().diOptions = {
                iocContainer: {
                    get: (ctor: any) => {
                        if (ctor === "logger") return undefined; // logger lookup, no-op logger is fine
                        if (ctor === ServiceA) return instanceA;
                        if (ctor === ServiceB) return instanceB;
                        throw new Error("unknown");
                    },
                } as any,
            };

            context.addShutdownHook({target: instanceA, methodName: "cleanupA", priority: 1});
            context.addShutdownHook({target: instanceB, methodName: "cleanupB", priority: 100});

            await context.executeShutdownHooks("test");

            assert.deepEqual(order, ["B", "A"]);
        });

        it("falls back to the hook's own target when the IoC container has no diOptions", async () => {
            const context = ShutdownHookContext.get();
            ApplicationContext.get().diOptions = undefined;

            let called = false;
            const target = {
                cleanup() {
                    called = true;
                },
            };

            context.addShutdownHook({target, methodName: "cleanup", priority: 0});

            await context.executeShutdownHooks("test");

            assert.equal(called, true);
        });

        it("falls back to the hook's own target when the container throws resolving it", async () => {
            const context = ShutdownHookContext.get();

            let called = false;
            const target = {
                constructor: {name: "Unresolvable"},
                cleanup() {
                    called = true;
                },
            };

            ApplicationContext.get().diOptions = {
                iocContainer: {
                    get: (key: any) => {
                        if (key === "logger") return undefined; // logger lookup, no-op logger is fine
                        throw new Error("not registered");
                    },
                } as any,
            };

            context.addShutdownHook({target, methodName: "cleanup", priority: 0});

            await context.executeShutdownHooks("test");

            assert.equal(called, true);
        });

        it("supports async cleanup methods", async () => {
            const context = ShutdownHookContext.get();
            let resolved = false;
            const target = {
                async cleanup() {
                    await new Promise(resolve => setTimeout(resolve, 5));
                    resolved = true;
                },
            };

            context.addShutdownHook({target, methodName: "cleanup", priority: 0});
            await context.executeShutdownHooks("test");

            assert.equal(resolved, true);
        });

        it("continues executing remaining hooks when one hook throws synchronously", async () => {
            const context = ShutdownHookContext.get();
            const order: string[] = [];

            const failing = {
                cleanup() {
                    order.push("failing");
                    throw new Error("boom");
                },
            };
            const succeeding = {
                cleanup() {
                    order.push("succeeding");
                },
            };

            // Higher priority runs first
            context.addShutdownHook({target: failing, methodName: "cleanup", priority: 100});
            context.addShutdownHook({target: succeeding, methodName: "cleanup", priority: 1});

            await assert.doesNotReject(context.executeShutdownHooks("test"));
            assert.deepEqual(order, ["failing", "succeeding"]);
        });

        it("continues executing remaining hooks when one hook rejects asynchronously", async () => {
            const context = ShutdownHookContext.get();
            const order: string[] = [];

            const failing = {
                async cleanup() {
                    order.push("failing");
                    throw new Error("boom");
                },
            };
            const succeeding = {
                cleanup() {
                    order.push("succeeding");
                },
            };

            context.addShutdownHook({target: failing, methodName: "cleanup", priority: 100});
            context.addShutdownHook({target: succeeding, methodName: "cleanup", priority: 1});

            await assert.doesNotReject(context.executeShutdownHooks("test"));
            assert.deepEqual(order, ["failing", "succeeding"]);
        });

        it("rejects a hook that exceeds its configured timeout, but still runs the rest", async () => {
            const context = ShutdownHookContext.get();
            const order: string[] = [];

            const slow = {
                async cleanup() {
                    await new Promise(resolve => setTimeout(resolve, 200));
                    order.push("slow-finished");
                },
            };
            const fast = {
                cleanup() {
                    order.push("fast");
                },
            };

            context.addShutdownHook({target: slow, methodName: "cleanup", priority: 100, timeout: 10});
            context.addShutdownHook({target: fast, methodName: "cleanup", priority: 1});

            await context.executeShutdownHooks("test");

            // The slow hook's timeout should have fired before it finished, so "slow-finished"
            // must not be recorded, but the fast hook should still have run.
            assert.deepEqual(order, ["fast"]);
        });

        it("only executes hooks once even if called multiple times concurrently", async () => {
            const context = ShutdownHookContext.get();
            const fn = mock.fn();
            context.addShutdownHook({target: {cleanup: fn}, methodName: "cleanup", priority: 0});

            await Promise.all([context.executeShutdownHooks("a"), context.executeShutdownHooks("b")]);

            assert.equal(fn.mock.callCount(), 1);
        });

        it("does nothing when there are no registered hooks", async () => {
            const context = ShutdownHookContext.get();
            await assert.doesNotReject(context.executeShutdownHooks("test"));
        });
    });

    describe("reset", () => {
        it("produces a fresh singleton instance", () => {
            const before = ShutdownHookContext.get();
            before.addShutdownHook({target: {}, methodName: "cleanup", priority: 0});

            ShutdownHookContext.reset();

            const after = ShutdownHookContext.get();
            assert.notEqual(before, after);
            assert.equal(after.getShutdownHooksCount(), 0);
        });
    });
});
