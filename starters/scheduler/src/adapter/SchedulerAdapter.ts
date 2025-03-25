import {ApplicationContext, ApplicationFeatureAdapter, ApplicationFeatureContext, Lifecycle} from "@nodeboot/context";
import cron from "node-cron";
import {SCHEDULING_FEATURE} from "../types";

/**
 * @typedef {Object} SchedulerOptions
 * @property {any} target - The target class instance where the scheduled function is defined.
 * @property {Function} cronFunction - The function that will be executed on schedule.
 * @property {string} cronExpression - The cron expression defining the schedule.
 */
type SchedulerOptions = {
    target: any;
    cronFunction: Function;
    cronExpression: string;
};

/**
 * SchedulerAdapter integrates cron-based job scheduling into a Node-Boot application.
 * It acts as an adapter to register scheduled functions as application features.
 *
 * This adapter ensures that scheduled methods are registered and executed
 * based on the specified cron expression using `node-cron`.
 *
 * @class SchedulerAdapter
 * @implements {ApplicationFeatureAdapter}
 *
 * @author Manuel Santos <ney.br.santos@gmail.com>
 */
@Lifecycle("persistence.started")
export class SchedulerAdapter implements ApplicationFeatureAdapter {
    private readonly options: SchedulerOptions;

    /**
     * Constructs a SchedulerAdapter instance.
     *
     * @param {SchedulerOptions} options - The configuration options for the scheduler.
     */
    constructor(options: SchedulerOptions) {
        this.options = options;
    }

    /**
     * Binds the scheduler to the application lifecycle.
     * Retrieves the associated bean from the dependency injection (DI) container,
     * validates the cron expression, and registers the scheduled function.
     *
     * @param {ApplicationFeatureContext} context - The application context containing logger and IoC container.
     */
    bind({logger, iocContainer}: ApplicationFeatureContext): void {
        const {target, cronFunction, cronExpression} = this.options;

        // Check if scheduling is enabled
        if (ApplicationContext.get().applicationFeatures[SCHEDULING_FEATURE]) {
            // Retrieve the class instance (bean) from the DI container
            const componentBean = iocContainer.get(target.constructor);

            // Validate cron expression
            if (cronExpression && cron.validate(cronExpression)) {
                logger.info(
                    `⏰ Registering scheduler ${target.constructor.name}:::${cronFunction.name}() with cron '${cronExpression}'`,
                );

                // Schedule the function execution
                cron.schedule(cronExpression, () => {
                    logger.info(
                        `⏰ Executing scheduled task: ${target.constructor.name}:::${cronFunction.name}() scheduled as ${cronExpression}`,
                    );
                    cronFunction.apply(componentBean);
                });
            } else {
                logger.warn(`Invalid CRON expression for @Scheduler at function ${cronFunction.name}(). 
                    Please make sure you configure the @Scheduler with a valid cron expression, following this format:\n
                    *    *    *    *    *\n 
                    │    │    │    │    │  
                    │    │    │    │    └── Day of the week (0 - 7) (Sunday = 0 or 7)  
                    │    │    │    └──── Month (1 - 12)  
                    │    │    └────── Day of the month (1 - 31)  
                    │    └──────── Hour (0 - 23)  
                    └────────── Minute (0 - 59)`);
            }
        } else {
            logger.warn(`⏰ Scheduler ${target.constructor.name}:::${cronFunction.name}() with cron ${cronExpression} 
            registered but scheduling is disabled. To enable scheduling, please decorate your Node-Boot application 
            class with @EnableScheduling()`);
        }
    }
}
