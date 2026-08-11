# 👻 `@nodeboot/ghost-server` – No-HTTP Server for Node-Boot

## Overview

`@nodeboot/ghost-server` is a **"no-server" adapter** for Node-Boot: it satisfies the same `NodeBootDriver`/server
contract as the Express, Fastify, Koa, and native HTTP adapters, but **does not open any network port or bind any
HTTP routes**. It's the adapter to reach for when you want the full Node-Boot bootstrap experience — DI,
`@Configuration`/`@Bean`, `@EnableRepositories()`, `@EnableScheduling()`, component scanning, lifecycle events — for
an application that isn't an HTTP service at all: CLI tools, scheduled background jobs, message consumers, or
auto-configuration/integration tests.

## ✨ Features

-   ✅ **Boot a full Node-Boot application with zero HTTP overhead** using `NodeBoot.run(GhostServer)`
-   ✅ **Implements the `@nodeboot/engine` driver contract** via `GhostDriver`, with typed `GhostServerRequest`/`GhostServerResponse` objects
-   ✅ **Compatible with `@EnableRepositories()`, `@EnableScheduling()`, `@EnableHttpClients()`**, and any other Node-Boot starter that doesn't require an HTTP server
-   ✅ **`listen()` resolves immediately** — no port binding, ideal for CLIs, tests, and background workers
-   ✅ **Manual action execution** via `getDriver().executeAction(...)` for exercising controllers/authorization outside of HTTP
-   ✅ **Same authorization/middleware pipeline** as HTTP-based adapters, driven by mock request/response objects instead of real ones

## 🚀 Installation

```sh
pnpm add @nodeboot/core @nodeboot/context @nodeboot/ghost-server @nodeboot/aot @nodeboot/di typedi reflect-metadata
```

No web framework peer dependencies are required — this is the point of the Ghost server.

## 🔥 Usage

### 1️⃣ Bootstrap a Node-Boot app with `GhostServer`

A real example from `samples/sample-ghost-server`, combining persistence, scheduling, and HTTP client starters
without any actual HTTP server:

```typescript
import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableRepositories} from "@nodeboot/starter-persistence";
import {EnableDI} from "@nodeboot/di";
import {EnableScheduling} from "@nodeboot/starter-scheduler";
import {EnableComponentScan} from "@nodeboot/aot";
import {EnableHttpClients} from "@nodeboot/starter-http";
import {GhostServer} from "@nodeboot/ghost-server";

@EnableDI(Container)
@EnableRepositories()
@EnableScheduling()
@EnableHttpClients()
@EnableComponentScan()
@NodeBootApplication()
export class GhostApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(GhostServer);
    }
}
```

```typescript
import {GhostApp} from "./app";

const app = new GhostApp();
app.start()
    .then(app => app.logger.debug(`GhostApp started successfully at port ${app.appOptions.port}`))
    .catch(reason => console.error(`Error starting GhostApp: ${reason}`));
```

`GhostServer.listen()` never actually binds a port — it logs `"NoServer running in non-HTTP mode (CLI / test /
auto-configuration)."` and resolves immediately, so `.start()` still completes and the DI container, scheduled
jobs, repositories, and any other auto-configured beans are fully wired and running.

### 2️⃣ Why use it instead of a real HTTP server

Typical use cases:

-   **Background workers / message consumers** — an app that only reacts to `@SqsListener`/scheduled `@Scheduled()`
    jobs and never needs to accept inbound HTTP requests.
-   **CLI tools** — reuse Node-Boot's DI/configuration/persistence stack for one-off scripts without paying for an
    HTTP listener you'll never use.
-   **Auto-configuration and integration tests** — boot the full application context (beans, repositories,
    lifecycle hooks) in a test without needing supertest/HTTP round-trips.

## 🧩 Controllers, authorization, and middleware without HTTP

`GhostDriver` still implements the full `NodeBootDriver` surface — including authorization checks and custom error
handling — but against a minimal, HTTP-agnostic shape instead of a real framework's request/response:

```typescript
export type GhostServerRequest = {
    params?: Record<string, any>;
    query?: Record<string, any>;
    body?: any;
    headers?: Record<string, string>;
    session?: Record<string, any>;
    cookies?: Record<string, string>;
    file?: any;
    files?: any;
};

export type GhostServerResponse = {
    statusCode?: number;
    headers?: Record<string, string>;
    body?: any;
    redirectUrl?: string;
    renderedTemplate?: {template: string; options: any};
    sendCalled?: boolean;
};
```

Authorization checkers and current-user resolvers registered via `@nodeboot/authorization` should be typed against
these Ghost types:

```typescript
import {Action, AuthorizationChecker} from "@nodeboot/context";
import {GhostServerRequest, GhostServerResponse} from "@nodeboot/ghost-server";

export class DefaultAuthorizationResolver implements AuthorizationChecker<GhostServerRequest, GhostServerResponse> {
    async check(action: Action<GhostServerRequest, GhostServerResponse>, roles: string[]): Promise<boolean> {
        const user = (action.request as any).user;
        if (!roles.length) return true;
        return !!user && roles.some(role => user.roles.includes(role));
    }
}
```

Since there's no real HTTP transport, **routes are never actually registered** (`registerRoutes()` and
`registerAction()` are no-ops) — instead, you exercise the pipeline manually by grabbing the driver and calling
`executeAction()` directly, e.g. from a test or a CLI entry point:

```typescript
const ghostServer = await NodeBoot.run(GhostServer); // returns the started GhostServer's NodeBootAppView context
const driver = (ghostServer as any).getDriver(); // GhostDriver

const response = await driver.executeAction(
    actionMetadata, // metadata for the action you want to invoke
    {headers: {authorization: "Bearer ..."}, params: {id: "123"}}, // GhostServerRequest
    action => myControllerMethod(action.request),
);

console.log(response.statusCode, response.body);
```

`registerMiddleware()` only recognizes `ErrorHandlerInterface` implementations (an `onError(error, action,
actionMetadata)` method) — plain `MiddlewareInterface` middlewares are not invoked by this driver, since there's no
request pipeline for them to hook into.

## 🛠️ Accessing the underlying driver

`GhostServer` exposes:

-   `getDriver()` → the `GhostDriver` instance, for manually invoking `executeAction()`
-   `getHttpServer()` / `getFramework()` / `getRouter()` → all return empty placeholder values, since there's no
    real HTTP server, framework instance, or router behind this adapter

## ✅ Summary

Use `@nodeboot/ghost-server` when you need the complete Node-Boot application lifecycle — DI, configuration,
persistence, scheduling, HTTP clients — **without** an HTTP server: background workers, CLIs, and
auto-configuration/integration tests.

## 📄 License

MIT
