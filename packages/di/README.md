# 🧩 `@nodeboot/di` – Node-Boot Dependency Injection

## Overview

`@nodeboot/di` connects a Node-Boot application to an IoC container.

In practice, this package does two things:

-   registers the container that Node-Boot should use at runtime via `@EnableDI(...)`
-   exposes `@Inject(...)` so classes can receive dependencies through property or constructor injection

Node-Boot is designed to work especially well with **TypeDI**. This package also contains runtime fallbacks for **Inversify** when those decorators are available.

---

## ✨ Features

✅ **Container activation with `@EnableDI`** – Tell Node-Boot which IoC container to use.  
✅ **Type-safe injection decorator** – Use `@Inject()` on properties and constructor parameters.  
✅ **TypeDI-first integration** – Works naturally with `typedi` and `reflect-metadata`.  
✅ **Inversify fallback** – If TypeDI is not available, decorator application falls back to Inversify.  
✅ **Supports Node-Boot core features** – Enables DI-aware auto-configuration, configuration-properties binding, and other container-backed features.

---

## 🚀 Installation

For the standard **TypeDI** setup:

```sh
pnpm add @nodeboot/di typedi reflect-metadata
```

If you prefer **Inversify**, install it instead of TypeDI:

```sh
pnpm add @nodeboot/di inversify reflect-metadata
```

> `typedi` and `inversify` are optional dependencies of this package. In real applications you should install the container you plan to use explicitly.

---

## 🔥 Usage

### 1️⃣ Enable DI in your application

The most common setup is to use the TypeDI `Container` and enable it at the application level.

```typescript
import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {ExpressServer} from "@nodeboot/express-server";
import {EnableDI} from "@nodeboot/di";
import {EnableComponentScan} from "@nodeboot/aot";

@EnableDI(Container)
@EnableComponentScan()
@NodeBootApplication()
export class FactsServiceApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

This is the switch that tells Node-Boot which container should resolve classes and container-managed values.

---

### 2️⃣ Inject class-based dependencies with `@Inject()`

When the dependency can be resolved by type metadata, you can use `@Inject()` with no arguments.

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

## 🧠 How `@EnableDI` works

`@EnableDI(iocContainer, options?)` stores your container configuration in the shared `ApplicationContext`.

During application bootstrap, Node-Boot reads that configuration and calls its internal `useContainer(...)` bridge. From that point on, DI-aware parts of the framework resolve instances through your container.

Without `@EnableDI(...)`, Node-Boot logs warnings and skips DI-dependent features such as:

-   dependency injection-backed resolution
-   auto-configuration bindings
-   `@ConfigurationProperties` binding
-   some OpenAPI integration paths

---

## 🔌 IoC container contract

The container passed to `@EnableDI(...)` must satisfy Node-Boot's container abstraction:

-   `get(...)` – resolve a class or named binding
-   `set(...)` – register a class or named binding
-   `has(...)` – check whether a binding exists
-   `reset()` – clear container state

This shape matches the APIs Node-Boot expects from the runtime container bridge.

### Optional `UseContainerOptions`

`@EnableDI(container, options)` accepts container options that affect fallback behavior:

-   `fallback` – use the default container when the user container returns nothing
-   `fallbackOnErrors` – use the default container when the user container throws

These options are forwarded to Node-Boot's internal container bridge.

---

## 🏗️ How this relates to TypeDI

TypeDI is the primary integration target of this package.

-   Node-Boot applications commonly call `@EnableDI(Container)` using `Container` from `typedi`
-   Node-Boot decorators such as `@Component()` and `@Service()` eventually delegate to `decorateDi(...)`
-   `decorateDi(...)` tries to apply TypeDI's `@Service(...)` decorator first
-   `@Inject(...)` tries to apply TypeDI's `@Inject(...)` decorator first

If TypeDI is not available at runtime, the package attempts to fall back to Inversify's `@injectable()` and `@inject(...)` decorators.

So while `@nodeboot/di` is a Node-Boot package, it is intentionally thin: it acts as the integration layer between Node-Boot and the underlying DI framework.

---

## 📚 API Reference

### `EnableDI(iocContainer, options?)`

Registers the IoC container that Node-Boot should use.

```typescript
EnableDI(Container);
EnableDI(Container, {fallback: true, fallbackOnErrors: true});
```

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

-   enable container-backed Node-Boot features
-   wire your application to **TypeDI**
-   inject services, configuration values, and named bindings with `@Inject(...)`
-   support framework-managed classes that still need dependency injection

If you are building a Node-Boot application with TypeDI, this package is the standard entry point for enabling DI.
