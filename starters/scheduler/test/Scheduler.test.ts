import {describe, it, beforeEach, afterEach} from "node:test";
import assert from "node:assert/strict";

import {ApplicationContext} from "@nodeboot/context";
import {Scheduler} from "../src";
import {SchedulerAdapter} from "../src/adapter";
import {SchedulingContext} from "../src/context/SchedulingContext";

function applyScheduler(target: any, propertyKey: string, cronExpression: string) {
    const descriptor = Object.getOwnPropertyDescriptor(target, propertyKey)!;
    Scheduler(cronExpression)(target, propertyKey, descriptor);
}

describe("Scheduler decorator", () => {
    let originalAdapters: any[];

    beforeEach(() => {
        SchedulingContext.reset();
        originalAdapters = ApplicationContext.get().applicationFeatureAdapters;
        ApplicationContext.get().applicationFeatureAdapters = [];
    });

    afterEach(() => {
        SchedulingContext.get().destroyAllCronJobs();
        SchedulingContext.reset();
        ApplicationContext.get().applicationFeatureAdapters = originalAdapters;
    });

    it("registers a SchedulerAdapter into the application feature adapters", () => {
        class ServiceA {
            runTask() {}
        }
        applyScheduler(ServiceA.prototype, "runTask", "0 * * * *");

        const adapters = ApplicationContext.get().applicationFeatureAdapters;
        assert.equal(adapters.length, 1);
        assert.ok(adapters[0] instanceof SchedulerAdapter);
    });

    it("does not register a second adapter for the same class/method/cron combination", () => {
        class ServiceB {
            runTask() {}
        }
        applyScheduler(ServiceB.prototype, "runTask", "0 * * * *");
        applyScheduler(ServiceB.prototype, "runTask", "0 * * * *");

        assert.equal(ApplicationContext.get().applicationFeatureAdapters.length, 1);
    });

    it("registers separate adapters for the same method with different cron expressions", () => {
        class ServiceC {
            runTask() {}
        }
        applyScheduler(ServiceC.prototype, "runTask", "0 * * * *");
        applyScheduler(ServiceC.prototype, "runTask", "30 * * * *");

        assert.equal(ApplicationContext.get().applicationFeatureAdapters.length, 2);
    });

    it("registers separate adapters for different methods on the same class", () => {
        class ServiceD {
            runTaskA() {}
            runTaskB() {}
        }
        applyScheduler(ServiceD.prototype, "runTaskA", "0 * * * *");
        applyScheduler(ServiceD.prototype, "runTaskB", "0 * * * *");

        assert.equal(ApplicationContext.get().applicationFeatureAdapters.length, 2);
    });

    it("registers separate adapters for the same method name on different classes", () => {
        class ServiceE {
            runTask() {}
        }
        class ServiceF {
            runTask() {}
        }
        applyScheduler(ServiceE.prototype, "runTask", "0 * * * *");
        applyScheduler(ServiceF.prototype, "runTask", "0 * * * *");

        assert.equal(ApplicationContext.get().applicationFeatureAdapters.length, 2);
    });
});
