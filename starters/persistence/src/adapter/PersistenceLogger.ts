import {AbstractLogger, LogLevel, LogMessage} from "typeorm";
import {Logger} from "winston";
import {PersistenceProperties} from "../property/PersistenceProperties";

/**
 * Logger implementation for TypeORM that delegates log messages
 * to a Winston logger, formatted according to persistence configuration.
 *
 * Extends TypeORM's {@link AbstractLogger}.
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
export class PersistenceLogger extends AbstractLogger {
    /**
     * Creates a new PersistenceLogger instance.
     *
     * @param {Logger} logger - The Winston logger instance to delegate logging to.
     * @param {PersistenceProperties} configs - Configuration properties for persistence and logging format.
     */
    constructor(private readonly logger: Logger, private readonly configs: PersistenceProperties) {
        super();
    }

    /**
     * Writes log messages to the configured logger.
     *
     * Processes a single or multiple log messages, formats them according to
     * configured log format, then sends them to the appropriate Winston logging method
     * depending on the log level or message type.
     *
     * @param {LogLevel} level - The TypeORM log level of the message(s).
     * @param {LogMessage | LogMessage[]} logMessage - One or more log messages to be written.
     */
    protected writeLog(level: LogLevel, logMessage: LogMessage | LogMessage[]) {
        const messages = this.prepareLogMessages(logMessage, this.configs.logFormat);

        for (const message of messages) {
            switch (message.type ?? level) {
                case "log":
                case "schema-build":
                case "migration":
                    this.logger.debug(message.message);
                    break;

                case "info":
                case "query":
                    if (message.prefix) {
                        this.logger.info(message.prefix, message.message);
                    } else {
                        this.logger.info(message.message);
                    }
                    break;

                case "warn":
                case "query-slow":
                    if (message.prefix) {
                        this.logger.warn(message.prefix, message.message);
                    } else {
                        this.logger.warn(message.message);
                    }
                    break;

                case "error":
                case "query-error":
                    if (message.prefix) {
                        this.logger.error(message.prefix, message.message);
                    } else {
                        this.logger.error(message.message);
                    }
                    break;
            }
        }
    }
}
