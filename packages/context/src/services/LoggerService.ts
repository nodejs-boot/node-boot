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
}
