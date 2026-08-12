import {JsonObject} from "./types";

/**
 * A service that provides a logging facility.
 *
 */
export interface LoggerService {
    error(message: string, meta?: Error | JsonObject): void;

    warn(message: string, meta?: Error | JsonObject): void;

    info(message: string, meta?: Error | JsonObject): void;

    debug(message: string, meta?: Error | JsonObject): void;

    child(meta: JsonObject): LoggerService;

    /**
     * Cheaply checks whether a given log level would actually be emitted, without paying the
     * cost of building the log message. Callers on hot paths (e.g. per-request logging in server
     * drivers) should guard expensive message construction (string interpolation, property
     * access on request/response objects, timing calls) behind this check instead of always
     * building the message and letting the logger silently discard it.
     *
     * Optional for backwards compatibility with custom `LoggerService` implementations that
     * don't support level introspection — callers must treat a missing method as "unknown,
     * assume enabled" to avoid silently dropping logs.
     */
    isLevelEnabled?(level: string): boolean;
}
