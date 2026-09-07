/**
 * Auto-configuration integration test for `@nodeboot/starter-scheduler` - positive case.
 *
 * The unit tests elsewhere in this package (`SchedulingContext.test.ts`, `Scheduler.test.ts`,
 * `SchedulerAdapter.test.ts`, `EnableScheduling.test.ts`, `SchedulerHooks.test.ts`) exercise the
 * starter's internal pieces directly, with mocked `logger`/`iocContainer`. None of them prove the
 * starter actually autowires into a *running* Node-Boot application: that `@EnableScheduling()`
 * plus `@Scheduler(...)` on a real `@Service` results in `node-cron` actually invoking that
 * service's method, resolved through the real DI container.
 *
 * This boots a real Node-Boot app (via `@nodeboot/node-test`'s `useNodeBoot`, on `GhostServer` -
 * scheduling needs no HTTP transport) with `@EnableScheduling()` applied, and waits for the
 * `@Scheduler("*\/1 * * * * *")`-decorated method to actually fire. See
 * `scheduling-disabled.it.test.ts` for the negative counterpart. Kept in a separate file/app boot
 * because `@nodeboot/node-test` does not support booting more than one `useNodeBoot()` app per file.
 */
import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {useNodeBoot} from "@nodeboot/node-test";
import {SchedulingEnabledApp} from "./fixtures/SchedulingEnabledApp";
import {EnabledCounterService} from "./fixtures/EnabledCounterService";

describe("@nodeboot/starter-scheduler auto-configuration - @EnableScheduling() applied", () => {
    // `@nodeboot/node-test` resolves `NodeBootApp` against its own (published) `@nodeboot/core`
    // dependency, which TypeScript treats as nominally distinct from this monorepo's workspace
    // package of the same name - cast at the boundary rather than relaxing the fixture's typing.
    useNodeBoot(SchedulingEnabledApp as any, ({useConfig}) => {
        useConfig({app: {name: "starter-scheduler-enabled-test"}});
    });

    test("the scheduled method actually runs, resolved from the real DI container", async () => {
        // `@nodeboot/node-test`'s own `useService()` resolves against a different (published)
        // `ApplicationContext` singleton than this workspace's real running app - see
        // `nodeboot-test-framework`. Retrieve straight from `typedi`'s Container, the one
        // `@EnableDI(Container)` actually wired the scheduler's resolved bean into.
        const counter = Container.get(EnabledCounterService);

        assert.equal(counter.runCount, 0);

        // `useTimer()`'s fake clock is installed in the `beforeTests` phase, which runs *after* the
        // app has already booted - but `@Scheduler` starts node-cron's real `setTimeout` chain
        // during boot itself (the `persistence.started` phase). A clock installed afterward can't
        // see or advance a timer that was already scheduled against the real, unfaked `setTimeout`,
        // so `useTimer()`/`advanceTimeBy()` cannot deterministically drive this tick - confirmed
        // empirically (it left `runCount` at 0). A real wait is the only thing that works here.
        await new Promise(resolve => setTimeout(resolve, 1500));

        assert.ok(
            counter.runCount >= 1,
            `expected the scheduled method to have run at least once, ran ${counter.runCount} times`,
        );
    });
});
