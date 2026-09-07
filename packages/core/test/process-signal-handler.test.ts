import "reflect-metadata";
import {describe, it, before, beforeEach, afterEach, mock} from "node:test";
import assert from "node:assert/strict";
import type {ProcessSignalHandler as ProcessSignalHandlerType, ServerInstance} from "../src/ProcessSignalHandler";

// The module under test auto-initializes a singleton (with real `process.on` registrations)
// as a side effect of being imported. We require it lazily below, after process.on/process.exit
// have already been mocked once, so the very first construction is captured too. On every test
// we additionally reset the private static `instance` field and re-mock process.on/process.exit,
// forcing a fresh construction under controlled conditions - this avoids ever triggering a real
// process.exit()/hanging setTimeout in the test runner.
let ProcessSignalHandler: typeof ProcessSignalHandlerType;

let onMock: ReturnType<typeof mock.method>;
let exitMock: ReturnType<typeof mock.method>;

function getRegisteredHandler(event: string): (...args: any[]) => void {
    const call = onMock.mock.calls.find(c => c.arguments[0] === event);
    assert.ok(call, `expected process.on to have been called with '${event}'`);
    return call!.arguments[1] as (...args: any[]) => void;
}

describe("ProcessSignalHandler", () => {
    before(() => {
        // First mock process.on/process.exit, then require the module so that even the
        // module-level auto-init (`ProcessSignalHandler.getInstance()` at the bottom of the
        // source file) is captured safely, in case this is the very first time it's loaded.
        exitMock = mock.method(process, "exit", (() => undefined) as unknown as typeof process.exit);
        // Fully replace process.on (rather than calling through) so we never attach real
        // listeners to the shared `process` EventEmitter - we invoke captured handlers directly.
        onMock = mock.method(process, "on", ((_event: string, _listener: (...a: any[]) => void) => process) as any);
        ({ProcessSignalHandler} = require("../src/ProcessSignalHandler"));
    });

    beforeEach(() => {
        exitMock = mock.method(process, "exit", (() => undefined) as unknown as typeof process.exit);
        // Fully replace process.on (rather than calling through) so we never attach real
        // listeners to the shared `process` EventEmitter - we invoke captured handlers directly.
        onMock = mock.method(process, "on", ((_event: string, _listener: (...a: any[]) => void) => process) as any);
        // Force a brand-new singleton instance so setupSignalHandlers() runs again under our mocks.
        (ProcessSignalHandler as any).instance = undefined;
        mock.timers.enable({apis: ["setTimeout"]});
    });

    afterEach(() => {
        mock.timers.reset();
        mock.restoreAll();
    });

    it("registers handlers for SIGTERM, SIGINT, uncaughtException and unhandledRejection", () => {
        ProcessSignalHandler.getInstance();

        const events = onMock.mock.calls.map(call => call.arguments[0]);
        assert.ok(events.includes("SIGTERM"));
        assert.ok(events.includes("SIGINT"));
        assert.ok(events.includes("uncaughtException"));
        assert.ok(events.includes("unhandledRejection"));
    });

    it("returns the same singleton instance across calls", () => {
        const a = ProcessSignalHandler.getInstance();
        const b = ProcessSignalHandler.getInstance();

        assert.equal(a, b);
        // getInstance() must not re-register handlers on the second call
        assert.equal(onMock.mock.calls.length, 4);
    });

    it("registers a server and closes it on graceful shutdown, then exits with code 0", async () => {
        const handler = ProcessSignalHandler.getInstance();
        const closeMock = mock.fn(async () => undefined);
        const fakeServer: ServerInstance = {
            close: closeMock,
            getHttpServer: mock.fn(() => undefined),
        };

        handler.registerServer(fakeServer);

        await (handler as any).gracefulShutdown("SIGTERM");

        assert.equal(closeMock.mock.calls.length, 1);
        assert.ok(exitMock.mock.calls.some(call => call.arguments[0] === 0));
    });

    it("invokes gracefulShutdown when the captured SIGTERM handler fires", async () => {
        const handler = ProcessSignalHandler.getInstance();
        const closeMock = mock.fn(async () => undefined);
        handler.registerServer({close: closeMock, getHttpServer: mock.fn()});

        const sigtermHandler = getRegisteredHandler("SIGTERM");
        sigtermHandler();

        // gracefulShutdown is fire-and-forget from within the handler; flush microtasks.
        await new Promise(resolve => setImmediate(resolve));
        await new Promise(resolve => setImmediate(resolve));

        assert.equal(closeMock.mock.calls.length, 1);
    });

    it("does not close unregistered servers on graceful shutdown", async () => {
        const handler = ProcessSignalHandler.getInstance();
        const closeMock = mock.fn(async () => undefined);
        const fakeServer: ServerInstance = {close: closeMock, getHttpServer: mock.fn()};

        handler.registerServer(fakeServer);
        handler.unregisterServer(fakeServer);

        await (handler as any).gracefulShutdown("SIGINT");

        assert.equal(closeMock.mock.calls.length, 0);
    });

    it("skips a second graceful shutdown while one is already in progress", async () => {
        const handler = ProcessSignalHandler.getInstance();
        (handler as any).isShuttingDown = true;

        await (handler as any).gracefulShutdown("SIGTERM");

        assert.equal(exitMock.mock.calls.length, 0);
    });

    it("tolerates a server whose close() rejects during graceful shutdown", async () => {
        const handler = ProcessSignalHandler.getInstance();
        const failingClose = mock.fn(async () => {
            throw new Error("close failed");
        });
        handler.registerServer({close: failingClose, getHttpServer: mock.fn()});

        await (handler as any).gracefulShutdown("SIGTERM");

        assert.equal(failingClose.mock.calls.length, 1);
        assert.ok(exitMock.mock.calls.some(call => call.arguments[0] === 0));
    });

    it("performs an emergency shutdown, closing the raw http server synchronously", () => {
        const handler = ProcessSignalHandler.getInstance();
        const httpCloseMock = mock.fn();
        handler.registerServer({
            close: mock.fn(async () => undefined),
            getHttpServer: mock.fn(() => ({close: httpCloseMock} as any)),
        });

        (handler as any).emergencyShutdown();

        assert.equal(httpCloseMock.mock.calls.length, 1);

        mock.timers.tick(1000);
        assert.ok(exitMock.mock.calls.some(call => call.arguments[0] === 1));
    });

    it("tolerates errors thrown while retrieving the http server during emergency shutdown", () => {
        const handler = ProcessSignalHandler.getInstance();
        handler.registerServer({
            close: mock.fn(async () => undefined),
            getHttpServer: mock.fn(() => {
                throw new Error("no http server");
            }),
        });

        assert.doesNotThrow(() => (handler as any).emergencyShutdown());

        mock.timers.tick(1000);
        assert.ok(exitMock.mock.calls.some(call => call.arguments[0] === 1));
    });

    it("invokes emergencyShutdown when the captured uncaughtException handler fires", () => {
        const handler = ProcessSignalHandler.getInstance();
        const httpCloseMock = mock.fn();
        handler.registerServer({
            close: mock.fn(async () => undefined),
            getHttpServer: mock.fn(() => ({close: httpCloseMock} as any)),
        });

        const uncaughtHandler = getRegisteredHandler("uncaughtException");
        uncaughtHandler(new Error("boom"));

        assert.equal(httpCloseMock.mock.calls.length, 1);
    });

    it("invokes emergencyShutdown when the captured unhandledRejection handler fires", () => {
        const handler = ProcessSignalHandler.getInstance();
        const httpCloseMock = mock.fn();
        handler.registerServer({
            close: mock.fn(async () => undefined),
            getHttpServer: mock.fn(() => ({close: httpCloseMock} as any)),
        });

        const rejectionHandler = getRegisteredHandler("unhandledRejection");
        rejectionHandler("some reason", Promise.resolve());

        assert.equal(httpCloseMock.mock.calls.length, 1);
    });
});
