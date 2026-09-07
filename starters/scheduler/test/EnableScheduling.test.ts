import {describe, it, beforeEach, afterEach} from "node:test";
import assert from "node:assert/strict";

import {ApplicationContext, ShutdownHookContext} from "@nodeboot/context";
import {EnableScheduling} from "../src";
import {SCHEDULING_FEATURE} from "../src/types";

describe("EnableScheduling decorator", () => {
    let originalFeatureFlag: boolean | undefined;

    beforeEach(() => {
        originalFeatureFlag = ApplicationContext.get().applicationFeatures[SCHEDULING_FEATURE];
        delete ApplicationContext.get().applicationFeatures[SCHEDULING_FEATURE];
    });

    afterEach(() => {
        ApplicationContext.get().applicationFeatures[SCHEDULING_FEATURE] = originalFeatureFlag;
    });

    it("sets the scheduling feature flag on the ApplicationContext", () => {
        EnableScheduling()(class {} as any);

        assert.equal(ApplicationContext.get().applicationFeatures[SCHEDULING_FEATURE], true);
    });

    it("registers the scheduler cleanup shutdown hook exactly once, even if applied multiple times", () => {
        EnableScheduling()(class {} as any);
        EnableScheduling()(class {} as any);

        const hooks = (ShutdownHookContext.get() as any).shutdownHooks as Array<{target: any}>;
        const schedulerHooks = hooks.filter(hook => hook.target?.constructor?.name === "SchedulerHooks");

        assert.equal(schedulerHooks.length, 1);
    });
});
