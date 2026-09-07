import "reflect-metadata";
import {describe, it} from "node:test";
import assert from "node:assert/strict";
import * as winston from "winston";
import {createLogger, createRootLogger, getVoidLogger} from "../src/logger/winston.logger";

describe("logger/winston.logger", () => {
    describe("getVoidLogger", () => {
        it("returns a Logger implementing the standard log methods", () => {
            const logger = getVoidLogger();

            assert.equal(typeof logger.info, "function");
            assert.equal(typeof logger.warn, "function");
            assert.equal(typeof logger.error, "function");
            assert.equal(typeof logger.debug, "function");
        });

        it("has a single silent Console transport, discarding all messages", () => {
            const logger = getVoidLogger();

            assert.equal(logger.transports.length, 1);
            const [transport] = logger.transports;
            assert.ok(transport instanceof winston.transports.Console);
            assert.equal((transport as winston.transports.ConsoleTransportInstance).silent, true);
        });
    });

    describe("createRootLogger", () => {
        it("defaults to 'info' level when LOG_LEVEL is not set in env", () => {
            const logger = createRootLogger({}, {});

            assert.equal(logger.level, "info");
        });

        it("honors LOG_LEVEL from the provided env object", () => {
            const logger = createRootLogger({}, {LOG_LEVEL: "debug"});

            assert.equal(logger.level, "debug");
        });

        it("allows options to override the level derived from env", () => {
            const logger = createRootLogger({level: "trace"}, {LOG_LEVEL: "debug"});

            assert.equal(logger.level, "trace");
        });

        it("registers the custom leveled severities (fatal..silent)", () => {
            const logger = createRootLogger({}, {});

            assert.deepEqual(logger.levels, {
                fatal: 0,
                error: 1,
                warn: 2,
                info: 3,
                debug: 4,
                trace: 5,
                silent: 6,
            });
        });

        it("creates a non-silent Console transport by default outside tests", () => {
            const logger = createRootLogger({}, {});

            assert.equal(logger.transports.length, 1);
            const [transport] = logger.transports as winston.transports.ConsoleTransportInstance[];
            assert.equal(transport!.silent, false);
        });

        it("silences the Console transport under tests when LOG_LEVEL is unset", () => {
            const logger = createRootLogger({}, {TEST_WORKER_ID: "1"});

            const [transport] = logger.transports as winston.transports.ConsoleTransportInstance[];
            assert.equal(transport!.silent, true);
        });

        it("does not silence the Console transport under tests when LOG_LEVEL is set", () => {
            const logger = createRootLogger({}, {TEST_WORKER_ID: "1", LOG_LEVEL: "debug"});

            const [transport] = logger.transports as winston.transports.ConsoleTransportInstance[];
            assert.equal(transport!.silent, false);
        });

        it("merges custom options over the defaults instead of replacing them", () => {
            const logger = createRootLogger({exitOnError: false}, {});

            assert.equal(logger.exitOnError, false);
            // Defaults should still be present alongside the custom option
            assert.equal(logger.transports.length, 1);
        });
    });

    describe("createLogger", () => {
        it("returns a logger whose defaultMeta carries the service and platform", () => {
            const logger = createLogger("my-service", "express");

            assert.equal(logger.defaultMeta.service, "my-service");
            assert.equal(logger.defaultMeta.platform, "express");
        });

        it("creates a fresh root logger when none is provided", () => {
            const logger = createLogger("svc-a", "koa");

            assert.equal(typeof logger.info, "function");
            assert.equal(logger.transports.length, 1);
        });

        it("reuses and mutates the provided rootLogger instance", () => {
            const rootLogger = createRootLogger({}, {});
            const logger = createLogger("svc-b", "fastify", undefined, rootLogger);

            assert.equal(logger, rootLogger);
            assert.equal(logger.defaultMeta.service, "svc-b");
            assert.equal(logger.defaultMeta.platform, "fastify");
        });

        it("implements the full standard logging method surface", () => {
            const logger = createLogger("svc-c", "native-http");

            for (const method of ["info", "warn", "error", "debug"]) {
                assert.equal(typeof (logger as any)[method], "function");
            }
        });
    });
});
