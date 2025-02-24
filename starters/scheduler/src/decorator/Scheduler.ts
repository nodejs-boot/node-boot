import {ApplicationContext} from "@nodeboot/context";
import {SchedulerAdapter} from "../adapter";

/**
 * A decorator to schedule the execution of a method based on a cron expression.
 *
 * This decorator registers the method as a scheduled task within the Node-Boot framework.
 * When applied to a method of a bean, it automatically schedules the method execution
 * according to the provided cron expression.
 *
 * @param {string} cronExpression - The cron expression defining the execution schedule.
 *
 * @returns {MethodDecorator} A decorator that registers the method for scheduled execution.
 *
 * @example
 * ```typescript
 * import { Logger } from "winston";
 * import { Service } from "@nodeboot/core";
 * import { Scheduler } from "@nodeboot/starter-scheduler";
 *
 * @Service()
 * class MyScheduledService {
 *   constructor(private readonly logger: Logger) {}
 *
 *   @Scheduler("0 * * * *") // Runs every hour
 *   runTask() {
 *     this.logger.info("Executing scheduled task...");
 *   }
 * }
 * ```
 *
 * @author Manuel Santos <ney.br.santos@gmail.com>
 */
export function Scheduler(cronExpression: string): MethodDecorator {
    return function (target: any, _: string | symbol, descriptor: PropertyDescriptor) {
        const schedulerAdapter = new SchedulerAdapter({
            target,
            cronExpression,
            cronFunction: descriptor.value,
        });
        ApplicationContext.get().applicationFeatureAdapters.push(schedulerAdapter);
    };
}
