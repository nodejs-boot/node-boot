import cron from "node-cron";

/**
 * Centralized context for managing scheduler lifecycle and preventing memory leaks.
 *
 * Tracks all active cron jobs and SchedulerAdapter instances, providing centralized cleanup and monitoring.
 *
 * Intended for internal use by the scheduling module.
 */
export class SchedulingContext {
    private static context: SchedulingContext;
    private readonly activeCronJobs: Set<cron.ScheduledTask> = new Set();
    private readonly activeInstances: Set<any> = new Set();
    private readonly registeredSchedulers: Set<string> = new Set();

    private constructor() {}

    static get(): SchedulingContext {
        if (!SchedulingContext.context) {
            SchedulingContext.context = new SchedulingContext();
        }
        return SchedulingContext.context;
    }

    addCronJob(cronJob: cron.ScheduledTask): void {
        this.activeCronJobs.add(cronJob);
    }

    removeCronJob(cronJob: cron.ScheduledTask): void {
        this.activeCronJobs.delete(cronJob);
    }

    addInstance(instance: any): void {
        this.activeInstances.add(instance);
    }

    removeInstance(instance: any): void {
        this.activeInstances.delete(instance);
    }

    registerScheduler(key: string): boolean {
        if (this.registeredSchedulers.has(key)) return false;
        this.registeredSchedulers.add(key);
        return true;
    }

    clearRegisteredSchedulers(): void {
        this.registeredSchedulers.clear();
    }

    getActiveCronJobsCount(): number {
        return this.activeCronJobs.size;
    }

    getActiveInstancesCount(): number {
        return this.activeInstances.size;
    }

    destroyAllCronJobs(): void {
        for (const cronJob of this.activeCronJobs) {
            try {
                cronJob.stop();
            } catch {
                // Ignore errors during stop
            }
        }
        this.activeCronJobs.clear();
        for (const instance of this.activeInstances) {
            try {
                if (typeof instance.destroy === "function") instance.destroy();
            } catch {
                // Ignore errors during destroy
            }
        }
        this.activeInstances.clear();
    }

    reset(): void {
        this.destroyAllCronJobs();
        this.clearRegisteredSchedulers();
    }

    static reset(): void {
        if (SchedulingContext.context) SchedulingContext.context.reset();
        SchedulingContext.context = undefined as any;
    }
}
