import {SchedulingContext} from "../context/SchedulingContext";
import {ApplicationContext, LoggerService, ShutdownHook} from "@nodeboot/context";

/**
 * @author Manuel Santos <ney.br.santos@gmail.com>
 */
export class SchedulerHooks {
    /**
     * Cleanup method that destroys all active cron jobs and scheduler instances.
     * This method is automatically called during application shutdown.
     */
    @ShutdownHook({priority: 1000, timeout: 10000})
    async cleanupScheduledTasks(): Promise<void> {
        const context = SchedulingContext.get();
        const cronJobsCount = context.getActiveCronJobsCount();
        const instancesCount = context.getActiveInstancesCount();

        if (cronJobsCount > 0 || instancesCount > 0) {
            const logger = ApplicationContext.get().diOptions?.iocContainer?.get("logger") as LoggerService;

            logger.info(`🗑️ Cleaning up ${cronJobsCount} cron jobs and ${instancesCount} scheduler instances...`);

            // Stop and destroy all cron jobs and instances
            context.destroyAllCronJobs();

            logger.info(`✅ Scheduler cleanup completed - all scheduled tasks stopped`);
        }
    }
}
