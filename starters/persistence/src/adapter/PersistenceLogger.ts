import {AbstractLogger, LogLevel, LogMessage} from "typeorm";
import {Logger} from "winston";
import {PersistenceProperties} from "../property/PersistenceProperties";

export class PersistenceLogger extends AbstractLogger {
    constructor(private readonly logger: Logger, private readonly configs: PersistenceProperties) {
        super();
    }

    /**
     * Write log to specific output.
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
