/**
 * Auto-configuration integration test for `@nodeboot/starter-scheduler` - negative case.
 *
 * Boots a real Node-Boot app (via `@nodeboot/node-test`'s `useNodeBoot`, on `GhostServer`) that
 * deliberately never applies `@EnableScheduling()`. Contrasted against
 * `scheduling-enabled.it.test.ts`'s `SchedulingEnabledApp`, which is identical except for that one
 * decorator. Kept in a separate file/app boot because `@nodeboot/node-test` does not support
 * booting more than one `useNodeBoot()` app per file.
 */
import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {useNodeBoot} from "@nodeboot/node-test";
import {SchedulingDisabledApp} from "./fixtures/SchedulingDisabledApp";
import {DisabledCounterService} from "./fixtures/DisabledCounterService";

describe("@nodeboot/starter-scheduler auto-configuration - no @EnableScheduling() applied", () => {
    useNodeBoot(SchedulingDisabledApp as any, ({useConfig}) => {
        useConfig({app: {name: "starter-scheduler-disabled-test"}});
    });

    test("the decorated method never runs, even after waiting past its cron interval", async () => {
        const counter = Container.get(DisabledCounterService);

        await new Promise(resolve => setTimeout(resolve, 1500));

        assert.equal(counter.runCount, 0);
    });
});
