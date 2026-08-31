import {Component} from "@nodeboot/core";
import {Scheduler} from "@nodeboot/starter-scheduler";
import {Logger} from "winston";

@Component()
export class SchedulersComponent {
    constructor(private readonly logger: Logger) {}

    @Scheduler("*/1 * * * *") // Every 1 minutes
    fastTask() {
        this.logger.info(`Running fast task at: ${new Date().toLocaleTimeString()}`);
    }

    @Scheduler("*/5 * * * *") // Every 5 minutes
    cleanUp() {
        this.logger.info(`Cleaning up at: ${new Date().toLocaleTimeString()}`);
    }

    @Scheduler("0 9 * * *") // Every day at 9 AM
    morningRoutine() {
        this.logger.info(`Morning routine started at: ${new Date().toLocaleTimeString()}`);
    }
}
