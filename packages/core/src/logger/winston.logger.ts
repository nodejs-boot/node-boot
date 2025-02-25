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

export const createLogger = (service: string, platform: string, rootLogger?: Logger) => {
    const logger = rootLogger ?? createRootLogger();
    logger.format = winston.format.combine(winston.format.timestamp(), winston.format.splat(), logger.format);

    logger.defaultMeta = {
        service,
        platform,
    };

    return logger;
};

export const createLoggerAdapter = (logger: Logger) => {
    const loggerAdapter = {
        level: logger.level,
        silent: logger.silent,
        info: (msg: any) => logger.info(msg),
        error: (msg: any) => logger.error(msg),
        warn: (msg: any) => logger.warn(msg),
        debug: (msg: any) => logger.debug(msg),
        fatal: (msg: any) => logger.log("fatal", msg),
        trace: (msg: any) => logger.log("trace", msg),
        child: () => loggerAdapter, // Important for Fastify's child loggers
    };
    return loggerAdapter;
};
