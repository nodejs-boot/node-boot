import * as winston from "winston";
import {format, Logger, LoggerOptions} from "winston";
import {Format, TransformableInfo} from "logform";
import merge from "lodash.merge";

/**
 * A logger that just throws away all messages.
 *
 * @public
 */
export function getVoidLogger(): winston.Logger {
    return winston.createLogger({
        transports: [new winston.transports.Console({silent: true})],
    });
}

/**
 * Creates a default "root" logger.
 *
 * @remarks
 *
 * This is the logger instance that will be the foundation for all other logger
 * instances passed to plugins etc, in a given backend.
 *
 * @public
 */
export function createRootLogger(options: winston.LoggerOptions = {}, env = process.env): winston.Logger {
    return winston
        .createLogger(
            merge<LoggerOptions, LoggerOptions>(
                {
                    levels: {
                        fatal: 0,
                        error: 1,
                        warn: 2,
                        info: 3,
                        debug: 4,
                        trace: 5,
                        silent: 6,
                    },
                    level: env["LOG_LEVEL"] || "info",
                    format: env["NODE_ENV"] === "production" ? winston.format.json() : colorFormat(),
                    transports: [
                        new winston.transports.Console({
                            silent: env["JEST_WORKER_ID"] !== undefined && !env["LOG_LEVEL"],
                            // Always write via the global `console.log/warn/error` functions instead of
                            // `console._stdout`/`console._stderr` (Node's raw process streams). This is a
                            // no-op in normal Node.js (where `console._stdout` is `process.stdout` anyway),
                            // but it's required in sandboxed runtimes like Cloudflare Workers, where
                            // `nodejs_compat` exposes a `console._stdout`-shaped stream whose `_write` is
                            // not implemented, while the native `console.log` global works natively.
                            forceConsole: true,
                        }),
                    ],
                },
                options,
            ),
        )
        .child({service: "node-boot"});
}

/**
 * Creates a pretty printed winston log formatter.
 */
function colorFormat(): Format {
    const colorizer = format.colorize();

    return format.combine(
        format.timestamp(),
        format.colorize({
            colors: {
                timestamp: "dim",
                prefix: "blue",
                field: "cyan",
                debug: "grey",
            },
        }),
        format.printf((info: TransformableInfo) => {
            const {timestamp, level, message, plugin, service, ...fields} = info;
            const prefix = plugin || service;
            const timestampColor = colorizer.colorize("timestamp", timestamp as string);
            const prefixColor = colorizer.colorize("prefix", prefix as string);

            const extraFields = Object.entries(fields)
                .map(([key, value]) => `${colorizer.colorize("field", `${key}`)}=${value}`)
                .join(" ");

            return `${timestampColor} ${prefixColor} ${level} ${message} ${extraFields}`;
        }),
    );
}

export const createLogger = (service: string, platform: string, level?: string, rootLogger?: Logger) => {
    const logger = rootLogger ?? createRootLogger({level});
    logger.format = winston.format.combine(winston.format.timestamp(), winston.format.splat(), logger.format);

    logger.defaultMeta = {
        service,
        platform,
    };

    return logger;
};
