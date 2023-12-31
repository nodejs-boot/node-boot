import * as winston from "winston";
import {format, LoggerOptions} from "winston";
import {Format, TransformableInfo} from "logform";
import {merge} from "lodash";

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
                    level: env["LOG_LEVEL"] || "info",
                    format: env["NODE_ENV"] === "production" ? winston.format.json() : colorFormat(),
                    transports: [
                        new winston.transports.Console({
                            silent: env["JEST_WORKER_ID"] !== undefined && !env["LOG_LEVEL"],
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
            const timestampColor = colorizer.colorize("timestamp", timestamp);
            const prefixColor = colorizer.colorize("prefix", prefix);

            const extraFields = Object.entries(fields)
                .map(([key, value]) => `${colorizer.colorize("field", `${key}`)}=${value}`)
                .join(" ");

            return `${timestampColor} ${prefixColor} ${level} ${message} ${extraFields}`;
        }),
    );
}

export const createLogger = (service: string, platform: string) => {
    const logger = createRootLogger();
    logger.format = winston.format.combine(winston.format.timestamp(), winston.format.splat(), logger.format);

    logger.defaultMeta = {
        service,
        platform,
    };

    return logger;
};
