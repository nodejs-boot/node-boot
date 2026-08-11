---
name: nodeboot-test-performance
description: Use when a Node-Boot integration test needs to assert that an operation, request handler, or code segment completes within a time budget — via the `usePerformanceBudget` hook in `@nodeboot/node-test`. Load `nodeboot-test-framework` first for the base `useNodeBoot()` pattern.
---

# Performance budgets in tests (`usePerformanceBudget`)

Declares named time budgets (in milliseconds) and lets tests start/stop labeled trackers around
code to measure and (optionally) enforce them. Demonstrated in
[`performance-budget-demo.test.ts`](https://github.com/nodejs-boot/node-boot-test-framework/blob/main/demos/node-test-demo/test/performance-budget-demo.test.ts).

```ts
const budgets = {quickOp: 100, heavyOp: 5};

const {usePerformanceBudget} = useNodeBoot(EmptyApp, ({useConfig, usePerformanceBudget}) => {
    useConfig({app: {port: 35005}});
    usePerformanceBudget({budgets, failOnExceeded: false}); // true fails the test on overrun instead of warning
});

it("tracks a fast operation within budget", () => {
    const {start} = usePerformanceBudget();
    const tracker = start("quickOp");
    doWork();
    tracker.stop();
    assert.ok(tracker.elapsed() < budgets.quickOp);
});
```

-   `failOnExceeded: false` (default-friendly for CI stability) only logs a warning when a budget is
    exceeded — use this while establishing baselines, or for budgets you're monitoring but not yet
    ready to enforce.
-   `failOnExceeded: true` fails the test itself on overrun — use once a budget is a real
    requirement (e.g. an SLA-backed endpoint).
-   Multiple labeled trackers can run within the same test (`start("comboOpA")`,
    `start("comboOpB")`) to measure several segments independently.

## Validate

Run `pnpm test`. Be mindful these budgets run on whatever machine executes the tests (dev laptop vs
CI runner) — keep budgets loose enough to avoid flaky failures from environment variance, or gate
`failOnExceeded: true` budgets to a dedicated perf-test job.
