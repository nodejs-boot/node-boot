import {ApplicationFeatureAdapter, ApplicationFeatureContext} from "@nodeboot/context";
import cron from "node-cron";

type SchedulerOptions = {
    target: any;
    cronFunction: Function;
    cronExpression: string;
};

export class SchedulerAdapter implements ApplicationFeatureAdapter {
    constructor(private readonly options: SchedulerOptions) {}

    bind({logger, iocContainer}: ApplicationFeatureContext): void {
        const {target, cronFunction, cronExpression} = this.options;

        // Retrieve the class instance (bean) from the DI container based on the target class
        const componentBean = iocContainer.get(target.constructor);

        // Validate cron expression
        if (cronExpression && cron.validate(cronExpression)) {
            // Schedule the method execution
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
    }
}
