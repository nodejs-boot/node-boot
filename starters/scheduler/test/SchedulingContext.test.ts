import {describe, it, beforeEach, afterEach, mock} from "node:test";
import assert from "node:assert/strict";

import {SchedulingContext} from "../src/context/SchedulingContext";

describe("SchedulingContext", () => {
    beforeEach(() => {
        SchedulingContext.reset();
    });

    afterEach(() => {
        SchedulingContext.reset();
    });

    it("get() returns a singleton instance", () => {
        const a = SchedulingContext.get();
        const b = SchedulingContext.get();
        assert.equal(a, b);
    });

    it("starts with no active cron jobs, instances or registered schedulers", () => {
        const context = SchedulingContext.get();
        assert.equal(context.getActiveCronJobsCount(), 0);
        assert.equal(context.getActiveInstancesCount(), 0);
    });

    describe("addCronJob / removeCronJob", () => {
        it("tracks added cron jobs in the active count", () => {
            const context = SchedulingContext.get();
            const job = {stop: mock.fn()} as any;

            context.addCronJob(job);
            assert.equal(context.getActiveCronJobsCount(), 1);
        });

        it("removes a cron job from the active count", () => {
            const context = SchedulingContext.get();
            const job = {stop: mock.fn()} as any;

            context.addCronJob(job);
            context.removeCronJob(job);
            assert.equal(context.getActiveCronJobsCount(), 0);
        });

        it("does not double count the same job added twice (Set semantics)", () => {
            const context = SchedulingContext.get();
            const job = {stop: mock.fn()} as any;

            context.addCronJob(job);
            context.addCronJob(job);
            assert.equal(context.getActiveCronJobsCount(), 1);
        });
    });

    describe("addInstance / removeInstance", () => {
        it("tracks added instances in the active count", () => {
            const context = SchedulingContext.get();
            context.addInstance({});
            assert.equal(context.getActiveInstancesCount(), 1);
        });

        it("removes an instance from the active count", () => {
            const context = SchedulingContext.get();
            const instance = {};
            context.addInstance(instance);
            context.removeInstance(instance);
            assert.equal(context.getActiveInstancesCount(), 0);
        });
    });

    describe("registerScheduler", () => {
        it("returns true the first time a scheduler key is registered", () => {
            const context = SchedulingContext.get();
            assert.equal(context.registerScheduler("Service::method::* * * * *"), true);
        });

        it("returns false for a duplicate scheduler key, preventing re-registration", () => {
            const context = SchedulingContext.get();
            const key = "Service::method::* * * * *";

            assert.equal(context.registerScheduler(key), true);
            assert.equal(context.registerScheduler(key), false);
        });

        it("treats different keys as independent registrations", () => {
            const context = SchedulingContext.get();
            assert.equal(context.registerScheduler("Service::methodA::* * * * *"), true);
            assert.equal(context.registerScheduler("Service::methodB::* * * * *"), true);
        });

        it("clearRegisteredSchedulers() allows previously registered keys to be re-registered", () => {
            const context = SchedulingContext.get();
            const key = "Service::method::* * * * *";

            context.registerScheduler(key);
            context.clearRegisteredSchedulers();

            assert.equal(context.registerScheduler(key), true);
        });
    });

    describe("destroyAllCronJobs", () => {
        it("stops every active cron job and clears the active count", () => {
            const context = SchedulingContext.get();
            const jobA = {stop: mock.fn()} as any;
            const jobB = {stop: mock.fn()} as any;
            context.addCronJob(jobA);
            context.addCronJob(jobB);

            context.destroyAllCronJobs();

            assert.equal(jobA.stop.mock.callCount(), 1);
            assert.equal(jobB.stop.mock.callCount(), 1);
            assert.equal(context.getActiveCronJobsCount(), 0);
        });

        it("calls destroy() on instances that implement it and clears the active count", () => {
            const context = SchedulingContext.get();
            const destroy = mock.fn();
            context.addInstance({destroy});

            context.destroyAllCronJobs();

            assert.equal(destroy.mock.callCount(), 1);
            assert.equal(context.getActiveInstancesCount(), 0);
        });

        it("does not throw for instances without a destroy() method", () => {
            const context = SchedulingContext.get();
            context.addInstance({});

            assert.doesNotThrow(() => context.destroyAllCronJobs());
            assert.equal(context.getActiveInstancesCount(), 0);
        });

        it("swallows errors thrown by a job's stop() and continues cleaning up the rest", () => {
            const context = SchedulingContext.get();
            const failingJob = {
                stop: () => {
                    throw new Error("boom");
                },
            } as any;
            const okJob = {stop: mock.fn()} as any;
            context.addCronJob(failingJob);
            context.addCronJob(okJob);

            assert.doesNotThrow(() => context.destroyAllCronJobs());
            assert.equal(okJob.stop.mock.callCount(), 1);
            assert.equal(context.getActiveCronJobsCount(), 0);
        });

        it("swallows errors thrown by an instance's destroy() and continues cleaning up the rest", () => {
            const context = SchedulingContext.get();
            const failingInstance = {
                destroy: () => {
                    throw new Error("boom");
                },
            };
            const okDestroy = mock.fn();
            context.addInstance(failingInstance);
            context.addInstance({destroy: okDestroy});

            assert.doesNotThrow(() => context.destroyAllCronJobs());
            assert.equal(okDestroy.mock.callCount(), 1);
            assert.equal(context.getActiveInstancesCount(), 0);
        });
    });

    describe("reset (instance method)", () => {
        it("destroys active jobs/instances and clears registered scheduler keys", () => {
            const context = SchedulingContext.get();
            const job = {stop: mock.fn()} as any;
            context.addCronJob(job);
            context.registerScheduler("Service::method::* * * * *");

            context.reset();

            assert.equal(context.getActiveCronJobsCount(), 0);
            assert.equal(context.registerScheduler("Service::method::* * * * *"), true);
        });
    });

    describe("static reset()", () => {
        it("produces a fresh singleton instance", () => {
            const before = SchedulingContext.get();
            before.addInstance({});

            SchedulingContext.reset();

            const after = SchedulingContext.get();
            assert.notEqual(before, after);
            assert.equal(after.getActiveInstancesCount(), 0);
        });

        it("is a no-op when no context has been created yet", () => {
            SchedulingContext.reset();
            assert.doesNotThrow(() => SchedulingContext.reset());
        });
    });
});
