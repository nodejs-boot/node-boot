---
name: nodeboot-starter-actuator
description: Use when the user wants Spring-Boot-style operational endpoints in a Node-Boot app with `@nodeboot/starter-actuator`; this starter is enabled with `@EnableActuator()` and is the right skill for `/actuator` health checks, readiness/liveness probes, Prometheus metrics, application info, and Kubernetes probe wiring.
---

# `@nodeboot/starter-actuator`

Use this starter for operational endpoints, not business API routes. `@EnableActuator()` auto-binds `/actuator/*` routes for the active Express/Fastify/Koa/native HTTP server.

## Enable

```ts
@EnableDI(Container)
@EnableActuator()
@EnableComponentScan()
@NodeBootApplication()
export class Application implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

Readiness is lifecycle-aware: with persistence enabled it stays `503` until `persistence.started`, which is the wiring you want for Kubernetes readiness probes.

## Endpoints

-   `/actuator/health`, `/actuator/health/readiness`, `/actuator/health/liveness`
-   `/actuator/metrics` and `/actuator/prometheus`
-   `/actuator/info`, `/actuator/git`, `/actuator/controllers`, `/actuator/interceptors`, `/actuator/middlewares`

There is no dedicated starter config block; the main decision is whether to expose `/actuator/*` only on internal networks because `/actuator/config` returns resolved config values.

Full docs: [`starters/actuator/README.md`](https://github.com/nodejs-boot/node-boot/blob/main/starters/actuator/README.md)

## Validate

`cd samples/sample-express && pnpm dev`
