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

`cd samples/sample-express && pnpm dev`
