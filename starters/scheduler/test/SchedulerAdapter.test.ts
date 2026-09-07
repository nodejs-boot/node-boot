import {describe, it, beforeEach, afterEach, mock} from "node:test";
import assert from "node:assert/strict";

import {ApplicationContext, Profile} from "@nodeboot/context";
import {SchedulerAdapter} from "../src/adapter";
import {SchedulingContext} from "../src/context/SchedulingContext";
import {SCHEDULING_FEATURE} from "../src/types";

function makeLogger() {
    return {
        error: mock.fn(),
        warn: mock.fn(),
        info: mock.fn(),
        debug: mock.fn(),
        child: mock.fn(),
    };
}

function lastScheduledTask(): any {
    const activeCronJobs = (SchedulingContext.get() as any).activeCronJobs as Set<any>;
    return [...activeCronJobs][activeCronJobs.size - 1];
}

describe("SchedulerAdapter", () => {
    let originalFeatureFlag: boolean | undefined;
    let originalActiveProfiles: string | undefined;

    beforeEach(() => {
        SchedulingContext.reset();
        originalFeatureFlag = ApplicationContext.get().applicationFeatures[SCHEDULING_FEATURE];
        originalActiveProfiles = process.env["NODE_BOOT_ACTIVE_PROFILES"];
    });

    afterEach(() => {
        SchedulingContext.get().destroyAllCronJobs();
        SchedulingContext.reset();
        ApplicationContext.get().applicationFeatures[SCHEDULING_FEATURE] = originalFeatureFlag;
        if (originalActiveProfiles === undefined) {
            delete process.env["NODE_BOOT_ACTIVE_PROFILES"];
        } else {
            process.env["NODE_BOOT_ACTIVE_PROFILES"] = originalActiveProfiles;
        }
    });

    it("does not schedule anything when the scheduling feature is disabled", () => {
        delete ApplicationContext.get().applicationFeatures[SCHEDULING_FEATURE];

        class TargetService {
            runTask() {}
        }
        const logger = makeLogger();
        const iocContainer = {get: mock.fn()} as any;
        const adapter = new SchedulerAdapter({
            target: TargetService.prototype,
            cronExpression: "0 * * * *",
            cronFunction: TargetService.prototype.runTask,
        });

        adapter.bind({logger: logger as any, iocContainer, config: {} as any});

        assert.equal(logger.warn.mock.callCount(), 1);
        assert.equal(iocContainer.get.mock.callCount(), 0);
        assert.equal(SchedulingContext.get().getActiveCronJobsCount(), 0);
    });

    it("does not schedule anything when the current active profiles do not allow the target", () => {
        ApplicationContext.get().applicationFeatures[SCHEDULING_FEATURE] = true;
        process.env["NODE_BOOT_ACTIVE_PROFILES"] = "production";

        @Profile(["development"])
        class TargetService {
            runTask() {}
        }
        const logger = makeLogger();
        const iocContainer = {get: mock.fn()} as any;
        const adapter = new SchedulerAdapter({
            target: TargetService.prototype,
            cronExpression: "0 * * * *",
            cronFunction: TargetService.prototype.runTask,
        });

        adapter.bind({logger: logger as any, iocContainer, config: {} as any});

        assert.equal(logger.warn.mock.callCount(), 1);
        assert.equal(iocContainer.get.mock.callCount(), 0);
        assert.equal(SchedulingContext.get().getActiveCronJobsCount(), 0);
    });

    it("warns and does not register a cron job for an invalid cron expression", () => {
        ApplicationContext.get().applicationFeatures[SCHEDULING_FEATURE] = true;

        class TargetService {
            runTask() {}
        }
        const logger = makeLogger();
        const componentBean = {};
        const iocContainer = {get: mock.fn(() => componentBean)} as any;
        const adapter = new SchedulerAdapter({
            target: TargetService.prototype,
            cronExpression: "not-a-valid-cron",
            cronFunction: TargetService.prototype.runTask,
        });

        adapter.bind({logger: logger as any, iocContainer, config: {} as any});

        assert.equal(logger.warn.mock.callCount(), 1);
        assert.equal(SchedulingContext.get().getActiveCronJobsCount(), 0);
    });

    it("resolves the bean from the IoC container and registers a cron job for a valid expression", () => {
        ApplicationContext.get().applicationFeatures[SCHEDULING_FEATURE] = true;

        class TargetService {
            runTask() {}
        }
        const logger = makeLogger();
        const componentBean = {};
        const iocContainer = {get: mock.fn(() => componentBean)} as any;
        const adapter = new SchedulerAdapter({
            target: TargetService.prototype,
            cronExpression: "0 * * * *",
            cronFunction: TargetService.prototype.runTask,
        });

        adapter.bind({logger: logger as any, iocContainer, config: {} as any});

        assert.equal(iocContainer.get.mock.callCount(), 1);
        assert.equal(iocContainer.get.mock.calls[0].arguments[0], TargetService);
        assert.equal(SchedulingContext.get().getActiveCronJobsCount(), 1);
        assert.equal(logger.info.mock.callCount(), 1);
    });

    it("invokes the decorated function bound to the resolved bean instance when the cron job fires", () => {
        ApplicationContext.get().applicationFeatures[SCHEDULING_FEATURE] = true;

        class TargetService {
            runTask() {}
        }
        const componentBean = {marker: "the-bean"};
        const iocContainer = {get: mock.fn(() => componentBean)} as any;
        const cronFunction = mock.fn();
        const adapter = new SchedulerAdapter({
            target: TargetService.prototype,
            cronExpression: "0 * * * *",
            cronFunction,
        });

        adapter.bind({logger: makeLogger() as any, iocContainer, config: {} as any});

        const task = lastScheduledTask();
        task.now();

        assert.equal(cronFunction.mock.callCount(), 1);
        assert.equal(cronFunction.mock.calls[0]!.this, componentBean);
    });
});
