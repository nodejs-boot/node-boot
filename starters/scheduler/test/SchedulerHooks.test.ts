import {describe, it, beforeEach, afterEach, mock} from "node:test";
import assert from "node:assert/strict";

import {ApplicationContext} from "@nodeboot/context";
import {SchedulerHooks} from "../src/hook/SchedulerHooks";
import {SchedulingContext} from "../src/context/SchedulingContext";

function makeLogger() {
    return {
        error: mock.fn(),
        warn: mock.fn(),
        info: mock.fn(),
        debug: mock.fn(),
        child: mock.fn(),
    };
}

describe("SchedulerHooks", () => {
    let originalDiOptions: any;

    beforeEach(() => {
        SchedulingContext.reset();
        originalDiOptions = ApplicationContext.get().diOptions;
    });

    afterEach(() => {
        SchedulingContext.get().destroyAllCronJobs();
        SchedulingContext.reset();
        ApplicationContext.get().diOptions = originalDiOptions;
    });

    it("destroys active cron jobs/instances and logs the cleanup when there is anything to clean up", async () => {
        const logger = makeLogger();
        ApplicationContext.get().diOptions = {
            iocContainer: {get: () => logger} as any,
        };

        SchedulingContext.get().addCronJob({stop: mock.fn()} as any);
        SchedulingContext.get().addInstance({});

        await new SchedulerHooks().cleanupScheduledTasks();

        assert.equal(SchedulingContext.get().getActiveCronJobsCount(), 0);
        assert.equal(SchedulingContext.get().getActiveInstancesCount(), 0);
        assert.equal(logger.info.mock.callCount(), 2);
    });

    it("does nothing (and never touches the logger) when there are no active jobs or instances", async () => {
        // No diOptions configured; if the logger were accessed this would throw when calling .info().
        ApplicationContext.get().diOptions = undefined;

        await assert.doesNotReject(new SchedulerHooks().cleanupScheduledTasks());
        assert.equal(SchedulingContext.get().getActiveCronJobsCount(), 0);
        assert.equal(SchedulingContext.get().getActiveInstancesCount(), 0);
    });
});
