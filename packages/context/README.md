# 🌐 `@nodeboot/context` – Node-Boot Runtime Context & Metadata

## Overview

`@nodeboot/context` is the shared runtime contract package behind Node-Boot.

It provides the **application context**, **IoC abstractions**, **controller/action metadata models**, **middleware/interceptor/auth contracts**, **lifecycle utilities**, and **shutdown hooks** used by the rest of the framework.

> `@nodeboot/context` does **not** expose the HTTP route decorators itself. Decorators such as `@Controller`, `@Get`, `@Post`, `@Put`, `@Delete`, `@Patch`, `@Body`, `@Param`, `@QueryParam`, `@HeaderParam`, `@UseBefore`, `@UseAfter`, and `@UseInterceptor` are defined in `@nodeboot/core` (and `@Authorized` / `@CurrentUser` in `@nodeboot/authorization`). This package provides the **types, options, metadata, and runtime state** those decorators rely on.

---

## ✨ Features

✅ **Global application state** via `ApplicationContext`  
✅ **Lifecycle-aware feature registration** via `@Lifecycle()`  
✅ **Conditional activation by profile** via `@Profile()` and `allowedProfiles()`  
✅ **Graceful shutdown support** via `@ShutdownHook()` and `ShutdownHookContext`  
✅ **IoC container integration** via `IocContainer`, `useContainer()`, and `getFromContainer()`  
✅ **Controller/action/parameter metadata models** for routing, auth, transforms, and response handling  
✅ **Middleware, interceptor, and error-handler contracts** for server adapters  
✅ **Authorization and current-user contracts** used by `@Authorized()` and `@CurrentUser()`  
✅ **Lifecycle bridge, health, and core info services** for runtime orchestration  
✅ **Utility types and option objects** shared across the Node-Boot ecosystem

---

## 📦 Installation

Install the package:

```sh
pnpm add @nodeboot/context
```

Optional peer dependencies used by parts of the runtime:

```sh
pnpm add class-transformer class-validator winston
```

If you are building HTTP controllers, you will typically use this package together with:

```sh
pnpm add @nodeboot/core @nodeboot/authorization
```

---

## 🧭 Package Layout

The `src/` tree is organized into these runtime areas:

-   `ApplicationContext.ts` – global singleton runtime state
-   `adapters/` – extension points for application, actuator, repositories, OpenAPI, Swagger UI, and configuration binding
-   `decorators/` – `Lifecycle`, `Profile`, and `ShutdownHook`
-   `ioc/` – container interfaces plus `useContainer()` / `getFromContainer()`
-   `metadata/` – runtime models for controllers, actions, params, interceptors, middleware, and response handlers
-   `metadata/args/` – raw metadata argument shapes recorded by decorators
-   `metadata/options/` – option types such as `BodyOptions`, `ParamOptions`, `HandlerOptions`, and `ControllerOptions`
-   `options/` – application/bootstrap option types such as `ApplicationOptions` and `NodeBootEngineOptions`
-   `services/` – `ApplicationLifecycleBridge`, `HealthService`, `CoreInfoService`, `Config`, and logger/service JSON types
-   `shutdown/` – centralized shutdown hook execution and signal handling
-   `types.ts`, `handlers.ts`, `checkers.ts`, `utils.ts` – shared contracts and helpers

---

## 🚀 Usage

### 1️⃣ Create lifecycle-aware application features

Use `ApplicationFeatureAdapter` together with `@Lifecycle()` to bind features at a specific application phase.

```typescript
import {ApplicationFeatureAdapter, ApplicationFeatureContext, ApplicationContext, Lifecycle} from "@nodeboot/context";

@Lifecycle("application.started")
export class MetricsFeature implements ApplicationFeatureAdapter {
    async bind({iocContainer, config, logger}: ApplicationFeatureContext): Promise<void> {
        const appName = config.getOptionalString("app.name") ?? "nodeboot-app";

        logger.info(`Starting metrics for ${appName}`);
        iocContainer.set("metrics-ready", true);
    }
}

ApplicationContext.get().applicationFeatureAdapters.push(new MetricsFeature());
```

Available lifecycle phases are:

-   `application.initialized`
-   `application.started`
-   `persistence.started`
-   `application.stopped`
-   `application.adapters.bound`

---

### 2️⃣ Implement middleware and interceptors

`@nodeboot/context` exports the request/response `Action` contract plus the interfaces used by server adapters and route decorators.

```typescript
import {Middleware} from "@nodeboot/core";
import {Action, MiddlewareInterface} from "@nodeboot/context";
import {Request, Response} from "express";

@Middleware({type: "before"})
export class LoggingMiddleware implements MiddlewareInterface<Request, Response> {
    async use(action: Action<Request, Response>): Promise<void> {
        console.log(`Incoming request: ${action.request.method} ${action.request.url}`);
    }
}
```

```typescript
import {Controller, Get, UseInterceptor} from "@nodeboot/core";
import {Action, InterceptorInterface} from "@nodeboot/context";
import {Request, Response} from "express";

export class EnvelopeInterceptor implements InterceptorInterface<Request, Response> {
    async intercept(_action: Action<Request, Response>, result: unknown): Promise<any> {
        return {data: result};
    }
}

@Controller("/health", "v1")
@UseInterceptor(EnvelopeInterceptor)
export class HealthController {
    @Get("/")
    async getHealth() {
        return {status: "ok"};
    }
}
```

---

### 3️⃣ Power controller decorators with shared option types

The decorators below come from `@nodeboot/core`, but their option types are defined here.

```typescript
import type {BodyOptions, ControllerOptions, HandlerOptions, ParamOptions} from "@nodeboot/context";
import {Body, Controller, Delete, Get, HeaderParam, Param, Patch, Post, Put, QueryParam} from "@nodeboot/core";
import {Authorized} from "@nodeboot/authorization";

const controllerOptions: ControllerOptions = {
    transformRequest: true,
    transformResponse: true,
};

const readOptions: HandlerOptions = {
    transformResponse: true,
};

const bodyOptions: BodyOptions = {
    required: true,
};

const queryOptions: ParamOptions = {
    required: false,
};

@Controller("/users", "v1", controllerOptions)
export class UserController {
    @Get("/", readOptions)
    async list(@QueryParam("status", queryOptions) status?: string, @HeaderParam("x-request-id") requestId?: string) {
        return {status, requestId};
    }

    @Get("/:id")
    async getById(@Param("id") id: number) {
        return {id};
    }

    @Post("/")
    @Authorized()
    async create(@Body(bodyOptions) payload: {name: string}) {
        return payload;
    }

    @Put("/:id")
    async replace(@Param("id") id: number, @Body(bodyOptions) payload: {name: string}) {
        return {id, ...payload};
    }

    @Patch("/:id")
    async patch(@Param("id") id: number, @Body() payload: Partial<{name: string}>) {
        return {id, ...payload};
    }

    @Delete("/:id")
    async remove(@Param("id") id: number) {
        return {deleted: id};
    }
}
```

Common parameter decorators backed by this package’s metadata and option types include:

-   `@Body()`
-   `@Param()`
-   `@QueryParam()` / `@QueryParams()`
-   `@HeaderParam()` / `@HeaderParams()`
-   `@Req()` / `@Res()` / `@Ctx()`
-   `@CurrentUser()`

Internally these become `ParamMetadata` records with `type` values such as `body`, `param`, `query`, `queries`, `header`, `headers`, `request`, `response`, `context`, and `current-user`.

---

### 4️⃣ Implement authorization and current-user resolvers

These interfaces are the contracts used when `@Authorized()` and `@CurrentUser()` are present on controller actions.

```typescript
import {Action, AuthorizationChecker, CurrentUserChecker} from "@nodeboot/context";
import {Request, Response} from "express";

export class DefaultAuthorizationResolver implements AuthorizationChecker<Request, Response> {
    async check(_action: Action<Request, Response>, roles: string[]): Promise<boolean> {
        const user = {roles: ["USER", "ADMIN"]};

        if (!roles.length) return true;
        return roles.some(role => user.roles.includes(role));
    }
}

export class LoggedInUserResolver implements CurrentUserChecker<Request, Response> {
    async check(_action: Action<Request, Response>): Promise<any> {
        return {
            id: 1,
            username: "exampleUser",
        };
    }
}
```

---

### 5️⃣ Activate features only for selected profiles

`@Profile()` attaches bean profile metadata, and `allowedProfiles()` evaluates it against `NODE_BOOT_ACTIVE_PROFILES`.

```typescript
import {Profile, allowedProfiles, getActiveProfiles} from "@nodeboot/context";

@Profile(["development", "staging"])
export class DevOnlyFeature {}

console.log(getActiveProfiles());
console.log(allowedProfiles(DevOnlyFeature));
```

```sh
export NODE_BOOT_ACTIVE_PROFILES=development,staging
```

---

### 6️⃣ Register graceful shutdown hooks

Use `@ShutdownHook()` to run cleanup logic on `SIGINT`, `SIGTERM`, `SIGUSR2`, uncaught exceptions, and unhandled rejections.

```typescript
import {ShutdownHook} from "@nodeboot/context";

export class PersistenceCleanup {
    @ShutdownHook({priority: 200, timeout: 10000})
    async closeConnections(): Promise<void> {
        console.log("Closing persistence connections...");
    }
}
```

Hooks are stored in `ShutdownHookContext`, sorted by priority, and executed with optional timeouts.

---

### 7️⃣ Work with the lifecycle bridge directly

`ApplicationLifecycleBridge` provides late-subscription support, event waiting, and sequential lifecycle binding.

```typescript
import {EventEmitter} from "node:events";
import {ApplicationLifecycleBridge, Config, LoggerService} from "@nodeboot/context";

const logger: LoggerService = {
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
    child: () => logger,
};
const config: Config = {
    has: () => false,
    keys: () => [],
    get: () => ({} as any),
    getOptional: () => undefined,
    getConfig: () => config,
    getOptionalConfig: () => config,
    getConfigArray: () => [],
    getOptionalConfigArray: () => [],
    getNumber: () => 0,
    getOptionalNumber: () => 0,
    getBoolean: () => false,
    getOptionalBoolean: () => false,
    getString: () => "",
    getOptionalString: () => "",
    getStringArray: () => [],
    getOptionalStringArray: () => [],
};

const bridge = new ApplicationLifecycleBridge(logger as any, config, new EventEmitter());
await bridge.listen();
await bridge.publish("application.started");
await bridge.awaitEvent("application.started", 5000);
```

---

## 🧩 Core Exports

### Runtime state

-   `ApplicationContext`
-   `Action`
-   `BeansContext`
-   `ActionType`
-   `ParamType`
-   `ResponseHandlerType`
-   `LifecycleType`

### IoC integration

-   `IocContainer`
-   `ClassConstructor`
-   `Constructable`
-   `ServiceIdentifier`
-   `Token`
-   `useContainer()`
-   `getFromContainer()`

### Contracts

-   `MiddlewareInterface`
-   `InterceptorInterface`
-   `ErrorHandlerInterface`
-   `AuthorizationChecker`
-   `CurrentUserChecker`
-   `RoleChecker`

### Decorators

-   `Lifecycle()`
-   `Profile()`
-   `ShutdownHook()`

### Metadata and options

-   `ControllerMetadata`, `ActionMetadata`, `ParamMetadata`
-   `UseMetadata`, `InterceptorMetadata`, `MiddlewareMetadata`, `ResponseHandlerMetadata`
-   `BodyOptions`, `ParamOptions`, `HandlerOptions`, `ControllerOptions`, `UploadOptions`
-   `ApplicationOptions`, `DependencyInjectionOptions`, `NodeBootEngineOptions`, `TransformerOptions`

### Services and utilities

-   `ApplicationLifecycleBridge`
-   `Config`
-   `LoggerService`
-   `HealthService`
-   `CoreInfoService`
-   `ShutdownHookContext`
-   `extractPlaceholderKey()`
-   `isPlaceholder()`
-   `toTargetClass()`

---

## ⚙️ How It Works Internally

### 1. `ApplicationContext` is the global runtime registry

`ApplicationContext` stores framework-wide state such as:

-   `serverType`
-   `applicationOptions`
-   `diOptions`
-   registered `controllerClasses`, `interceptorClasses`, and `globalMiddlewares`
-   `applicationFeatureAdapters`
-   `configurationAdapters` and `configurationPropertiesAdapters`
-   `openApi`, `swaggerUI`, `repositoriesAdapter`, and `actuatorAdapter`
-   global class-transformer, validation, authorization, and current-user settings

### 2. Decorators record metadata; this package models it

Decorators from `@nodeboot/core` and `@nodeboot/authorization` push raw metadata argument objects into the engine. This package defines both the **raw arg shapes** and the **runtime metadata models** used afterward:

-   `ControllerMetadataArgs` → `ControllerMetadata`
-   `ActionMetadataArgs` → `ActionMetadata`
-   `ParamMetadataArgs` → `ParamMetadata`
-   `UseMetadataArgs` → `UseMetadata`
-   `UseInterceptorMetadataArgs` → `InterceptorMetadata`
-   `ResponseHandlerMetadataArgs` → `ResponseHandlerMetadata`

`ActionMetadata.build()` computes important runtime details such as:

-   `fullRoute`
-   `isBodyUsed`, `isFileUsed`, `isFilesUsed`
-   `authorizedRoles`
-   `headers`
-   `successHttpCode`
-   `nullResultCode` / `undefinedResultCode`
-   `responseClassTransformOptions`

### 3. Lifecycle adapters are bound sequentially

`ApplicationLifecycleBridge` exists to prevent race conditions between lifecycle phases.

It queues adapter binding so that:

1. `application.initialized` finishes first
2. then `application.started`
3. then `persistence.started`

Only after that flow completes does it publish `application.adapters.bound`.

This is especially important when later adapters depend on services registered by earlier ones.

### 4. Shutdown is centralized

`ShutdownHookContext`:

-   collects methods decorated with `@ShutdownHook()`
-   sorts them by priority
-   applies optional per-hook timeouts
-   registers listeners for `SIGINT`, `SIGTERM`, `SIGUSR2`, `uncaughtException`, and `unhandledRejection`
-   resolves hook instances from the IoC container when possible

### 5. Profiles and IoC are framework-wide concerns

-   `allowedProfiles()` and `getActiveProfiles()` read `NODE_BOOT_ACTIVE_PROFILES`
-   `useContainer()` and `getFromContainer()` let Node-Boot resolve instances through your chosen IoC container, with optional fallback behavior
-   `ControllerMetadata.getInstance()` and `MiddlewareMetadata.instance` rely on that container bridge at runtime

### 6. Health and build info are provided as services

-   `HealthService` reports liveness/readiness based on lifecycle events
-   `CoreInfoService` exposes host info, Node version, memory data, package build info, and active profiles
-   `Config` and `LoggerService` define the contracts passed into lifecycle-aware adapters

---

## 📝 Notes

-   The package imports `reflect-metadata` from its main entrypoint.
-   `class-transformer` and `class-validator` are optional but supported throughout parameter and response metadata.
-   Many of the most visible HTTP decorators live in sibling packages, but this package is the shared runtime foundation that makes them work consistently across Express, Koa, Fastify, native HTTP, and serverless adapters.

---

## 📄 License

MIT
