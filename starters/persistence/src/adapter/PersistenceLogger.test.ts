import {PersistenceLogger} from "./PersistenceLogger";
import {Logger} from "winston";
import {PersistenceProperties} from "../property/PersistenceProperties";
import {LogMessage} from "typeorm";

describe("PersistenceLogger", () => {
    let logger: jest.Mocked<Logger>;
    let configs: PersistenceProperties;
    let persistenceLogger: PersistenceLogger;

    beforeEach(() => {
        logger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        } as any;
        configs = {} as any;
        persistenceLogger = new PersistenceLogger(logger, configs);
    });

    it("delegates debug level logs to logger.debug", () => {
        persistenceLogger["writeLog"]("log", {message: "debug message"});
        expect(logger.debug).toHaveBeenCalledWith("debug message");
    });

    it("delegates info level logs to logger.info with prefix if present", () => {
        persistenceLogger["writeLog"]("info", {message: "info message", prefix: "[INFO]"});
        expect(logger.info).toHaveBeenCalledWith("[INFO]:", "info message");
    });

    it("delegates info level logs to logger.info without prefix", () => {
        persistenceLogger["writeLog"]("info", {message: "info message"});
        expect(logger.info).toHaveBeenCalledWith("info message");
    });

    it("delegates warn level logs to logger.warn with prefix if present", () => {
        persistenceLogger["writeLog"]("warn", {message: "warn message", prefix: "[WARN]"});
        expect(logger.warn).toHaveBeenCalledWith("[WARN]:", "warn message");
    });

    it("delegates warn level logs to logger.warn without prefix", () => {
        persistenceLogger["writeLog"]("warn", {message: "warn message"});
        expect(logger.warn).toHaveBeenCalledWith("warn message");
    });

    it("delegates error level logs to logger.error with prefix if present", () => {
        persistenceLogger["writeLog"]("error", {message: "error message", prefix: "[ERROR]"});
        expect(logger.error).toHaveBeenCalledWith("[ERROR]:", "error message");
    });

    it("delegates error level logs to logger.error without prefix", () => {
        persistenceLogger["writeLog"]("error", {message: "error message"});
        expect(logger.error).toHaveBeenCalledWith("error message");
    });

    it("handles array of log messages and delegates each to correct logger method", () => {
        const messages: LogMessage[] = [
            {message: "debug message", type: "log"},
            {message: "info message", type: "info"},
            {message: "warn message", type: "warn"},
            {message: "error message", type: "error"},
        ];
        persistenceLogger["writeLog"]("log", messages);
        expect(logger.debug).toHaveBeenCalledWith("debug message");
        expect(logger.info).toHaveBeenCalledWith("info message");
        expect(logger.warn).toHaveBeenCalledWith("warn message");
        expect(logger.error).toHaveBeenCalledWith("error message");
    });

    it("uses message.type over level if present", () => {
        persistenceLogger["writeLog"]("warn", {message: "should be info", type: "info"});
        expect(logger.info).toHaveBeenCalledWith("should be info");
        expect(logger.warn).not.toHaveBeenCalled();
    });

    it("delegates schema-build and migration types to logger.debug", () => {
        persistenceLogger["writeLog"]("log", {message: "schema build", type: "schema-build"});
        persistenceLogger["writeLog"]("log", {message: "migration", type: "migration"});
        expect(logger.debug).toHaveBeenCalledWith("schema build");
        expect(logger.debug).toHaveBeenCalledWith("migration");
    });

    it("delegates query type to logger.info", () => {
        persistenceLogger["writeLog"]("info", {message: "query message", type: "query"});
        expect(logger.info).toHaveBeenCalledWith("query message");
    });

    it("delegates query-slow type to logger.warn", () => {
        persistenceLogger["writeLog"]("warn", {message: "slow query", type: "query-slow"});
        expect(logger.warn).toHaveBeenCalledWith("slow query");
    });

    it("delegates query-error type to logger.error", () => {
        persistenceLogger["writeLog"]("error", {message: "query error", type: "query-error"});
        expect(logger.error).toHaveBeenCalledWith("query error");
    });
});
