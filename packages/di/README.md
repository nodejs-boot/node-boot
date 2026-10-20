# 🧩 `@nodeboot/di` – Node-Boot Dependency Injection

## Overview

`@nodeboot/di` connects a Node-Boot application to its IoC container.

**Node-Boot uses [Nonna](https://github.com/nodejs-boot/node-boot/tree/main/di) — a zero-reflection,
runtime-agnostic DI container — always on, with no setup.**

In practice, this package does three things:

-   ships Node-Boot's container (Nonna), used automatically by every application that doesn't pick another one
-   exposes `@Inject(...)` so classes can receive dependencies through property or constructor injection
-   lets you plug in your own container with `@EnableDI(container)` (TypeDI, Inversify, ...)

Node-Boot's decorators (`@Component`, `@Service`, `@Controller`, `@Middleware`, `@Interceptor`,
`@Inject`) need no extra configuration.

---

## ✨ Features

✅ **Nonna, zero setup** – DI, auto-configuration, and `@ConfigurationProperties` binding all work out of the box.  
✅ **Pluggable** – `@EnableDI(container)` swaps Nonna for your own container (TypeDI, Inversify).  
✅ **Type-safe injection decorator** – Use `@Inject()` on properties and constructor parameters.  
✅ **Ahead-of-time wiring** – `nodeboot-compile` infers constructor dependencies statically.  
✅ **Supports Node-Boot core features** – Enables DI-aware auto-configuration, configuration-properties binding, and other container-backed features.

---

## 🚀 Installation

```sh
pnpm add @nodeboot/di reflect-metadata
```

---

## 🔥 Usage

### 1️⃣ Bootstrap your application

No DI setup is needed — Node-Boot's container is active by default.

```typescript
import "reflect-metadata";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {ExpressServer} from "@nodeboot/express-server";
import {EnableComponentScan} from "@nodeboot/aot";
@EnableComponentScan()
@NodeBootApplication()
export class FactsServiceApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

---

### 2️⃣ Inject class-based dependencies with `@Inject()`

When the dependency can be resolved by type metadata (`emitDecoratorMetadata`), you can use `@Inject()` with no arguments on a class property.

```typescript
import {Action, AuthorizationChecker} from "@nodeboot/context";
import {Component} from "@nodeboot/core";
import {Request, Response} from "express";
import {Inject} from "@nodeboot/di";
import {Logger} from "winston";

@Component()
export class DefaultAuthorizationResolver implements AuthorizationChecker<Request, Response> {
    @Inject()
    private logger: Logger;

    async check(_: Action<Request, Response>, roles: string[]): Promise<boolean> {
        this.logger.info(`Checking authorization`);
        return roles.length === 0;
    }
}
```

This pattern is used throughout the sample applications for services such as loggers and other container-managed classes.

---

### 3️⃣ Inject named or token-based dependencies

Use `@Inject("...")` when a value is registered in the container by name.

```typescript
import {Controller, Get} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {Logger} from "winston";
import {UserService} from "../services/users.service";
import {AppConfigProperties} from "../config/AppConfigProperties";

@Controller("/users", "v1")
export class UserController {
    constructor(
        private readonly user: UserService,
        private readonly logger: Logger,
        @Inject("app-config")
        private readonly appConfigProperties: AppConfigProperties,
    ) {}

    @Get("/")
    async getUsers() {
        this.logger.info(`Injected backend configuration properties: ${JSON.stringify(this.appConfigProperties)}`);
        return this.user.findAllUser();
    }
}
```

This is a real pattern used in the repository for injecting application configuration.

---

### ⚠️ Registration and injection must match

How a dependency is _registered_ in the container determines how it must be _injected_. This is
the most common source of `undefined`/resolution errors:

-   **Registered by class** (e.g. `iocContainer.set(SomeClass, instance)`, or an unadorned
    `@Component()`/`@Service()`): inject by concrete type — `@Inject(SomeClass)` (or a bare
    `@Inject()` on a property), with no name. This is what `@Configuration`/`@Bean` auto-configurations do when there's a single
    canonical implementation (e.g. `iocContainer.set(OpenAiChatModel, chatModel)`).
-   **Registered by name/token** (e.g. `iocContainer.set("app-config", value)` — typically used when
    the token can't be a class, such as config objects, third-party clients, or an interface with
    multiple possible implementations): inject with `@Inject("app-config")` using that exact string.
    The declared TypeScript type at the injection site is irrelevant to resolution once a name is
    used — it only needs to be structurally compatible — because the container resolves purely off
    the string key, not the type.

Never mix the two: a bare `@Inject()` against a name-registered dependency (or `@Inject("name")`
against a class-registered one) will fail to resolve. When consuming a bean from a starter or
auto-configuration, check how that package registers it (its README or source, e.g.
`iocContainer.set("ChatMemory", ...)` vs `iocContainer.set(ChatClient, ...)`) and match the
injection style accordingly.

---

### 4️⃣ Use property injection in framework-managed classes

`@Inject()` also works well in classes that are instantiated indirectly by framework integrations, such as persistence event subscribers.

```typescript
import {EntityEventSubscriber} from "@nodeboot/starter-persistence";
import {EntitySubscriberInterface, InsertEvent} from "typeorm";
import {Inject} from "@nodeboot/di";
import {Logger} from "winston";
import {GreetingService} from "../../services/greeting.service";
import {User} from "../entities";

@EntityEventSubscriber()
export class UserEntityEventListener implements EntitySubscriberInterface<User> {
    @Inject()
    private logger: Logger;

    @Inject()
    private greetingService: GreetingService;

    listenTo() {
        return User;
    }

    beforeInsert(event: InsertEvent<User>) {
        this.logger.info(`BEFORE USER INSERTED: `, event.entity);
    }

    afterInsert(event: InsertEvent<User>) {
        this.logger.info(`AFTER USER INSERTED: `, event.entity);
        this.greetingService.sayHello(event.entity);
    }
}
```

Internally, `@nodeboot/di` records metadata for field injection so Node-Boot integrations can complete injection in cases where plain constructor resolution is not enough.

---

## 🍰 Nonna

Nonna is a **zero-reflection** DI container: it never reads
`design:paramtypes` for implicit constructor parameters, so a plain `constructor(private readonly fooService: FooService) {}` with no
decorator is **not** enough for Nonna to resolve `fooService` on its own. A class's constructor dependencies must come from one of:

1. **An explicit `@Inject(token)` on every constructor parameter** — a concrete class, string, or
   symbol token all work:

    ```typescript
    @Service()
    export class UserService {
        constructor(
            @Inject(UserRepository) private readonly userRepo: UserRepository,
            @Inject("app-name") private readonly appName: string,
        ) {}
    }
    ```

2. **Running Nonna's AOT compiler** (`nonna-compile`) as a build step, which statically scans your
   TypeScript source with the real compiler and generates the dependency graph ahead of time — no
   decorators needed for concrete-class parameters. Add `@nonnajs/compiler` as a dev dependency:

    ```json
    {
        "scripts": {
            "compile-deps": "nonna-compile",
            "prebuild": "npm run compile-deps",
            "build": "tsc -p tsconfig.build.json"
        }
    }
    ```

    No further configuration is needed: `@nodeboot/core` and `@nodeboot/di` each ship a `.nonna.json`
    that teaches the compiler Node-Boot's decorators (`@Component`/`@Service`/`@Controller`/
    `@Middleware`/`@Interceptor` and `@Inject`), and the generated file imports `defineDependencies`
    from `@nodeboot/di`, so you don't need a direct `@nonnajs/di` dependency either. Import the
    generated file once at application bootstrap, e.g.
    `import "./__generated__/nonna-dependencies.generated";`, before `NodeBoot.run(...)`. Note that
    the compiler rejects a bare `@Inject()` on a constructor parameter — either drop it (a concrete
    class type is inferred) or pass the token explicitly.

If neither applies, resolving that class throws a clear
"unresolved constructor dependency" error at startup rather than silently returning `undefined`.

**Property injection is supported.** `@Inject()` on a class _property_ records a field dependency
with Nonna — common in framework-managed classes like persistence event subscribers. A bare
`@Inject()` on a field reads the property type from `design:type` (requires
`emitDecoratorMetadata`); `@Inject(token)` works with an explicit class, string, or symbol token.

---

## 🔌 Using another container (`@EnableDI`)

Nonna is the default. Without `@EnableDI(...)` nothing needs to be configured. To use a different container,
decorate your application class with `@EnableDI(container)` and install the matching library
(`typedi` or `inversify`; both are optional dependencies of `@nodeboot/di`, so they install automatically where possible and are never required):

```typescript
import {Container} from "typedi";
import {EnableDI} from "@nodeboot/di";

@EnableDI(Container)
@NodeBootApplication()
export class MyApp implements NodeBootApp {
    start() {
        return NodeBoot.run(ExpressServer);
    }
}
```

`EnableDI` accepts any `IocContainer` (`get`, `set`, `has`, `reset`) and an optional `UseContainerOptions`
second argument. Beans still register with Nonna, so the default keeps working; when `@EnableDI(...)` is
present, `@Component`/`@Service`/`@Inject` are additionally applied through the plugin library — for beans
decorated before `@EnableDI` ran as well as after — so apps that never use `@EnableDI` never touch TypeDI or
Inversify, even when those libraries are installed. With TypeDI, inject with its own conventions (for example
`@Inject(() => Dependency)` on properties). The Nonna compiler step is not needed with a plugin container.

---

## 📚 API Reference

### `Inject(...)`

Injects a dependency into a property or constructor parameter.

Supported forms from the public API include:

-   `@Inject()`
-   `@Inject(SomeClass)`
-   `@Inject("service-name")`
-   `@Inject(mySymbol)`
-   `@Inject(token)`

---

## ✅ When to use this package

Use `@nodeboot/di` when you want to:

-   use container-backed Node-Boot features
-   inject services, configuration values, and named bindings with `@Inject(...)`
-   support framework-managed classes that still need dependency injection

If you are building a Node-Boot application, this package is the standard entry point for DI.
