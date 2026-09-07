---
name: nodeboot-starter-scheduler
description: Use when the user wants cron-based background jobs in a Node-Boot app with `@nodeboot/starter-scheduler`; this starter is enabled with `@EnableScheduling()` and `@Scheduler(...)`, and it is the right skill for lifecycle-aware scheduled methods that start automatically at application startup.
---

# `@nodeboot/starter-scheduler`

Use this starter for periodic background work inside the app process. `@EnableScheduling()` activates the scheduler feature, and `@Scheduler("cron")` marks the methods that should run.

## Enable

```ts
@EnableScheduling()
@NodeBootApplication()
export class SampleApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

## Minimal job

```ts
@Service()
export class TaskService {
    @Scheduler("0 * * * *")
    logMessage() {
        console.log(`Task executed at: ${new Date().toISOString()}`);
    }
}
```

There is no dedicated `integrations.*` config block; the key API is the cron expression passed to `@Scheduler(...)`.

Full docs: [`starters/scheduler/README.md`](https://github.com/nodejs-boot/node-boot/blob/main/starters/scheduler/README.md)

## Validate

`cd samples/sample-express && pnpm dev` for a manual check.

For automated proof that `@EnableScheduling()` actually autowires, see
`starters/scheduler/test/scheduling-enabled.it.test.ts` and `scheduling-disabled.it.test.ts`: two
`useNodeBoot()`-booted apps (on `@nodeboot/ghost-server` - scheduling needs no HTTP transport),
identical except one applies `@EnableScheduling()`. Only the enabled one ticks a `node-cron` job
that increments a counter on a `@Service` (standard apps use `useService()`; monorepo tests resolve
via `Container.get()` from `typedi` due to workspace dependencies). See
`nodeboot-extending-nodeboot`'s "Testing a starter package" section before writing this style of
test for a different starter.
