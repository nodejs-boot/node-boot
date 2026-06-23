import {describe, test, beforeEach} from "node:test";
import assert from "node:assert/strict";
import {PersistenceLogger} from "./PersistenceLogger";
import {PersistenceProperties} from "../property/PersistenceProperties";
import {LogMessage} from "typeorm";

interface MockLoggerMethod {
    calls: any[][];
}

interface MockLogger {
    debug: ((...args: any[]) => void) & MockLoggerMethod;
    info: ((...args: any[]) => void) & MockLoggerMethod;
    warn: ((...args: any[]) => void) & MockLoggerMethod;
    error: ((...args: any[]) => void) & MockLoggerMethod;
}

function createMockLoggerMethod(): MockLoggerMethod & ((...args: any[]) => void) {
    const calls: any[][] = [];
    const fn = (...args: any[]) => {
        calls.push(args);
    };
    (fn as any).calls = calls;
    return fn as any;
}

function createMockLogger(): MockLogger {
    return {
        debug: createMockLoggerMethod(),
        info: createMockLoggerMethod(),
        warn: createMockLoggerMethod(),
        error: createMockLoggerMethod(),
    };
}

describe("PersistenceLogger", () => {
    let logger: MockLogger;
    let configs: PersistenceProperties;
    let persistenceLogger: PersistenceLogger;

    beforeEach(() => {
        logger = createMockLogger();
        configs = {} as any;
        persistenceLogger = new PersistenceLogger(logger as any, configs);
    });

    test("delegates debug level logs to logger.debug", () => {
        persistenceLogger["writeLog"]("log", {message: "debug message"});
        assert.ok(logger.debug.calls.length > 0, "logger.debug was called");
        assert.deepEqual(logger.debug.calls[0], ["debug message"]);
    });

    test("delegates info level logs to logger.info with prefix if present", () => {
        persistenceLogger["writeLog"]("info", {message: "info message", prefix: "[INFO]"});
        assert.ok(logger.info.calls.length > 0, "logger.info was called");
        assert.deepEqual(logger.info.calls[0], ["[INFO]:", "info message"]);
    });

    test("delegates info level logs to logger.info without prefix", () => {
        persistenceLogger["writeLog"]("info", {message: "info message"});
        assert.ok(logger.info.calls.length > 0, "logger.info was called");
        assert.deepEqual(logger.info.calls[0], ["info message"]);
    });

    test("delegates warn level logs to logger.warn with prefix if present", () => {
        persistenceLogger["writeLog"]("warn", {message: "warn message", prefix: "[WARN]"});
        assert.ok(logger.warn.calls.length > 0, "logger.warn was called");
        assert.deepEqual(logger.warn.calls[0], ["[WARN]:", "warn message"]);
    });

    test("delegates warn level logs to logger.warn without prefix", () => {
        persistenceLogger["writeLog"]("warn", {message: "warn message"});
        assert.ok(logger.warn.calls.length > 0, "logger.warn was called");
        assert.deepEqual(logger.warn.calls[0], ["warn message"]);
    });

    test("delegates error level logs to logger.error with prefix if present", () => {
        persistenceLogger["writeLog"]("error", {message: "error message", prefix: "[ERROR]"});
        assert.ok(logger.error.calls.length > 0, "logger.error was called");
        assert.deepEqual(logger.error.calls[0], ["[ERROR]:", "error message"]);
    });

    test("delegates error level logs to logger.error without prefix", () => {
        persistenceLogger["writeLog"]("error", {message: "error message"});
        assert.ok(logger.error.calls.length > 0, "logger.error was called");
        assert.deepEqual(logger.error.calls[0], ["error message"]);
    });

    test("handles array of log messages and delegates each to correct logger method", () => {
        const messages: LogMessage[] = [
            {message: "debug message", type: "log"},
            {message: "info message", type: "info"},
            {message: "warn message", type: "warn"},
            {message: "error message", type: "error"},
        ];
        persistenceLogger["writeLog"]("log", messages);
        assert.ok(logger.debug.calls.length > 0, "logger.debug was called");
        assert.deepEqual(logger.debug.calls[0], ["debug message"]);
        assert.ok(logger.info.calls.length > 0, "logger.info was called");
        assert.deepEqual(logger.info.calls[0], ["info message"]);
        assert.ok(logger.warn.calls.length > 0, "logger.warn was called");
        assert.deepEqual(logger.warn.calls[0], ["warn message"]);
        assert.ok(logger.error.calls.length > 0, "logger.error was called");
        assert.deepEqual(logger.error.calls[0], ["error message"]);
    });

    test("uses message.type over level if present", () => {
        persistenceLogger["writeLog"]("warn", {message: "should be info", type: "info"});
        assert.ok(logger.info.calls.length > 0, "logger.info was called");
        assert.deepEqual(logger.info.calls[0], ["should be info"]);
        assert.equal(logger.warn.calls.length, 0, "logger.warn should not be called");
    });

    test("delegates schema-build and migration types to logger.debug", () => {
        persistenceLogger["writeLog"]("log", {message: "schema build", type: "schema-build"});
        persistenceLogger["writeLog"]("log", {message: "migration", type: "migration"});
        assert.ok(logger.debug.calls.length >= 2, "logger.debug was called at least twice");
        assert.deepEqual(logger.debug.calls[0], ["schema build"]);
        assert.deepEqual(logger.debug.calls[1], ["migration"]);
    });

    test("delegates query type to logger.info", () => {
        persistenceLogger["writeLog"]("info", {message: "query message", type: "query"});
        assert.ok(logger.info.calls.length > 0, "logger.info was called");
        assert.deepEqual(logger.info.calls[0], ["query message"]);
    });

    test("delegates query-slow type to logger.warn", () => {
        persistenceLogger["writeLog"]("warn", {message: "slow query", type: "query-slow"});
        assert.ok(logger.warn.calls.length > 0, "logger.warn was called");
        assert.deepEqual(logger.warn.calls[0], ["slow query"]);
    });

    test("delegates query-error type to logger.error", () => {
        persistenceLogger["writeLog"]("error", {message: "query error", type: "query-error"});
        assert.ok(logger.error.calls.length > 0, "logger.error was called");
        assert.deepEqual(logger.error.calls[0], ["query error"]);
    });
});
