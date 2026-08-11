# 🚂 `@nodeboot/express-server` – Express Server for Node-Boot

## Overview

`@nodeboot/express-server` is the Express.js server adapter for **Node-Boot**.

It bridges **`@nodeboot/core`** and **`@nodeboot/engine`** to an underlying Express application, so your Node-Boot controllers, middleware, parameter decorators, authorization hooks, validation, and response handling run on top of Express with minimal setup.

---

## ✨ Features

✅ **Boot a Node-Boot app on Express** with `NodeBoot.run(ExpressServer)`  
✅ **Implements the `@nodeboot/engine` driver contract** via `ExpressDriver`  
✅ **Auto-registers controllers and middleware** discovered by Node-Boot  
✅ **Built-in request body support** for JSON and text payloads  
✅ **Optional CORS and session middleware** through server configuration  
✅ **Multipart upload support** through `multer` for upload decorators  
✅ **Cookie and session parameter extraction** for controller decorators  
✅ **Express-native middleware access** through the application bean  
✅ **Handles JSON, text, buffers, streams, redirects, and rendered templates**

---

## 🚀 Installation

Install the server package, Node-Boot core packages, and the Express peer dependencies used by this adapter:

```sh
pnpm add @nodeboot/core @nodeboot/context @nodeboot/express-server @nodeboot/aot @nodeboot/di typedi reflect-metadata express body-parser multer cors cookie express-session
```

> `express`, `body-parser`, `multer`, `cors`, `cookie`, and `express-session` are peer dependencies of this package.

---

## 🔥 Usage

### 1️⃣ Bootstrap a Node-Boot app with Express

This is the real startup pattern used in the repository samples:

```typescript
import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableDI} from "@nodeboot/di";
import {EnableComponentScan} from "@nodeboot/aot";
import {ExpressServer} from "@nodeboot/express-server";

@EnableDI(Container)
@EnableComponentScan()
@NodeBootApplication()
export class SampleApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

`ExpressServer` creates the Express application, binds Node-Boot's engine driver, registers discovered controllers/middleware, and starts listening using your Node-Boot application options.

---

### 2️⃣ Add controllers normally

Once Express is selected as the server, you keep writing standard Node-Boot controllers:

```typescript
import {Controller, Get} from "@nodeboot/core";

@Controller("/hello", "v1")
export class HelloController {
    @Get("/")
    async hello(): Promise<string> {
        return "Hello, World!";
    }

    @Get()
    async getHelloProps(): Promise<Record<string, any>> {
        return {
            prop1: "value1",
            prop2: 2,
            prop3: true,
            prop4: {nestedProp: "nestedValue"},
        };
    }
}
```

With the example above, the Express driver registers the controller routes and sends the returned values through Express responses.

---

## ⚙️ Express-specific configuration

This package exports two helpful types:

-   `ExpressServerConfigs`
-   `ExpressServerConfigProperties`

The common pattern is to expose a `SERVER_CONFIGURATIONS` bean and map configuration from the `server` property path.

### 1️⃣ Provide server configuration as a bean

```typescript
import {Bean, Configuration, SERVER_CONFIGURATIONS, SERVER_CONFIGURATIONS_PROPERTY_PATH} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import {ExpressServerConfigProperties, ExpressServerConfigs} from "@nodeboot/express-server";

@Configuration()
export class ServerConfiguration {
    @Bean(SERVER_CONFIGURATIONS)
    public serverConfig({config, logger}: BeansContext): ExpressServerConfigs {
        logger.debug(`Resolving express server configuration`);

        const serverConfigs = config.getOptional<ExpressServerConfigProperties>(SERVER_CONFIGURATIONS_PROPERTY_PATH);

        return {
            cookie: {
                options: serverConfigs?.cookie,
            },
            cors: {
                options: serverConfigs?.cors,
            },
            session: {
                options: serverConfigs?.session,
            },
            multipart: {
                options: serverConfigs?.multipart,
            },
            template: {},
        };
    }
}
```

### 2️⃣ Example `app-config.yaml`

```yaml
server:
    cors:
        origin: "*"
        credentials: true
    session:
        secret: "change-me"
        resave: false
        saveUninitialized: false
    multipart:
        limits:
            fileSize: 10485760
    cookie:
        path: "/"
        httpOnly: true
```

### 3️⃣ What each option does

-   **`cors`** → passed to `cors(...)` and registered with `app.use(...)`
-   **`session`** → passed to `express-session(...)` and registered with `app.use(...)`
-   **`multipart`** → used as the global Multer configuration for upload decorators such as `@UploadedFile(...)` and `@UploadedFiles(...)`
-   **`cookie`** → used when parsing request cookies for decorators such as `@CookieParam(...)` and `@CookieParams()`
-   **`template`** → part of the shared server config shape, but this package does **not** auto-configure an Express view engine for you

> If you build `ExpressServerConfigs` manually, each entry follows the engine's `MaybeOptions` pattern: `{ enabled?: boolean, options?: ... }`.

---

## 🧩 Adding native Express middleware

Because the underlying Express application is available from the bean context, you can register regular Express middleware in a configuration class:

```typescript
import {Bean, Configuration} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import {Application} from "express";
import hpp from "hpp";
import helmet from "helmet";

@Configuration()
export class SecurityConfiguration {
    @Bean()
    public security({application}: BeansContext<Application>) {
        application.use(hpp());
        application.use(helmet());
        application.disable("x-powered-by");
    }
}
```

This is the right place for Express-only setup such as security headers, proxy settings, custom parsers, static assets, or view engine configuration.

---

## 🔐 Authorization and current user integration

Because the Express driver works with Express's own `Request`/`Response` objects, authorization checkers and current-user resolvers you register via `@nodeboot/authorization` should be typed against Express's concrete types rather than a generic/framework-agnostic signature:

```typescript
import {Action, AuthorizationChecker, CurrentUserChecker} from "@nodeboot/context";
import {Request, Response} from "express";

export class DefaultAuthorizationResolver implements AuthorizationChecker<Request, Response> {
    async check(action: Action<Request, Response>, roles: string[]): Promise<boolean> {
        const user = (action.request as any).user;
        if (!roles.length) return true;
        return !!user && roles.some(role => user.roles.includes(role));
    }
}

export class LoggedInUserResolver implements CurrentUserChecker<Request, Response> {
    async check(action: Action<Request, Response>) {
        return (action.request as any).user ?? null;
    }
}
```

The driver invokes your authorization checker for any action decorated with `@Authorized(...)`, throwing `AuthorizationRequiredError` or `AccessDeniedError` (converted to `401`/`403` responses) when the check fails or no checker is registered at all.

---

## 🪝 Middleware behavior

Node-Boot middlewares (`MiddlewareInterface`) are also typed against `Request`/`Response` when targeting Express:

```typescript
import {Middleware} from "@nodeboot/core";
import {MiddlewareInterface} from "@nodeboot/context";
import {Request, Response} from "express";

@Middleware({type: "before"})
export class RequestLoggerMiddleware implements MiddlewareInterface<Request, Response> {
    async use({request}: {request: Request; response: Response}): Promise<void> {
        console.log(`${request.method} ${request.originalUrl}`);
    }
}
```

-   **`{type: "before"}`** middlewares run ahead of the controller action, wired in as regular Express middleware functions on the matched route.
-   **`{type: "after"}`** middlewares run after the controller action has produced a result, still within the same Express route handler chain.
-   A custom `ErrorHandlerInterface` implementation (one with an `onError(error, action, actionMetadata)` method) is detected automatically and used instead of the built-in global error handler for any error not already marked as `handled`.
-   Global middlewares registered without `@Controller`-level scoping are mounted with `app.use(routePrefix, middlewareWrapper)`, so they still respect your configured API route prefix.

---

## 🔌 How this package relates to `@nodeboot/core` and `@nodeboot/engine`

### `@nodeboot/core`

`ExpressServer` extends Node-Boot's base server abstraction and is the class you pass to:

```typescript
NodeBoot.run(ExpressServer);
```

It also uses core server configuration constants such as:

-   `SERVER_CONFIGURATIONS`
-   `SERVER_CONFIGURATIONS_PROPERTY_PATH`

### `@nodeboot/engine`

Under the hood, this package provides `ExpressDriver`, which implements the `NodeBootDriver` contract from `@nodeboot/engine`.

That driver is responsible for:

-   initializing Express-related middleware before route registration
-   registering Node-Boot controllers as Express routes
-   resolving action parameters from `req`/`res`
-   applying route prefixes and engine options
-   running authorization and current-user hooks configured by the engine
-   transforming successful results into Express responses
-   converting errors into HTTP responses

In practice, `@nodeboot/core` starts the application lifecycle, `@nodeboot/engine` handles controller execution, and `@nodeboot/express-server` connects both of them to Express.

---

## 🛠️ Runtime behavior

A few implementation details are helpful to know:

-   `ExpressServer` creates an Express app and installs `express.json()` and `express.urlencoded({extended: true})`
-   the driver adds body parsing middleware for controller actions that consume request bodies
-   routes using upload decorators automatically get Multer middleware attached
-   CORS and session middleware are only enabled when corresponding server config is provided
-   request/response handling supports plain values, JSON, `Buffer`, `Uint8Array`, streams, redirects, and rendered templates
-   if you use template rendering, configure the Express view engine manually on the application bean

---

## 📦 Exports

This package exports:

```typescript
export {ExpressServer} from "./server";
export * from "./types";
```

So the main public API is:

-   `ExpressServer`
-   `ExpressServerConfigs`
-   `ExpressServerConfigProperties`

---

## ✅ Summary

Use `@nodeboot/express-server` when you want to run a Node-Boot application on Express while keeping the Node-Boot programming model: decorators, DI, configuration beans, middleware, authorization, validation, and controller-driven routing.
