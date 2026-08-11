# ⚡ `@nodeboot/fastify-server` – Fastify Server for Node-Boot

## Overview

`@nodeboot/fastify-server` is the Fastify-backed HTTP server package for **Node-Boot**.

It connects Fastify to the `@nodeboot/engine` driver contract, so controllers, middlewares, authorization, validation, interceptors, and response handling defined with Node-Boot decorators are registered as real Fastify routes and hooks.

Use it when you want to run a Node-Boot application on **Fastify** instead of Express, Koa, or the native HTTP server.

---

## ✨ Features

✅ **Boot Node-Boot apps with Fastify** via `NodeBoot.run(FastifyServer)`  
✅ **Implements the `@nodeboot/engine` driver contract** for route registration and request handling  
✅ **Supports Node-Boot controllers and decorators** such as `@Get`, `@Post`, `@Body`, `@Param`, `@QueryParams`, and more  
✅ **Supports authorization hooks** with Fastify request/reply types  
✅ **Supports before/after/error middlewares** using Fastify hooks  
✅ **Supports redirects and template rendering**  
✅ **Supports optional Fastify plugins** for cookies, CORS, sessions, multipart uploads, and views  
✅ **Includes request/response HTTP logging** and graceful shutdown support  
✅ **Adds `request.locals`** for per-request data storage

---

## 📦 Installation

Install the server package together with Fastify and the core Node-Boot packages you use:

```sh
pnpm add @nodeboot/core @nodeboot/engine @nodeboot/fastify-server fastify
```

Most Node-Boot applications also use dependency injection and metadata decorators:

```sh
pnpm add @nodeboot/di @nodeboot/aot typedi reflect-metadata
```

### Optional Fastify plugins

This package loads Fastify plugins **only when you configure them**. Install only the ones you need:

```sh
pnpm add @fastify/cookie @fastify/session @fastify/multipart @fastify/view @fastify/cors
```

> `@nodeboot/fastify-server` declares these as peer dependencies. If you enable one in server configuration but do not install it, startup will fail with an installation hint.

---

## 🚀 Usage

### 1️⃣ Bootstrap a Node-Boot app with Fastify

This is the real startup pattern used in `samples/sample-fastify`:

```typescript
import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableDI} from "@nodeboot/di";
import {EnableComponentScan} from "@nodeboot/aot";
import {FastifyServer} from "@nodeboot/fastify-server";

@EnableDI(Container)
@EnableComponentScan()
@NodeBootApplication()
export class SampleApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(FastifyServer);
    }
}
```

`@nodeboot/core` provides `NodeBoot.run(...)`, the application lifecycle, decorators, and the base server abstraction.  
`@nodeboot/fastify-server` provides the Fastify-specific server implementation used at runtime.

---

### 2️⃣ Create controllers normally

Once Fastify is selected as the server, your Node-Boot controllers are registered as Fastify routes:

```typescript
import {Body, Controller, Get, HttpCode, Param, Post} from "@nodeboot/core";
import {Authorized} from "@nodeboot/authorization";

@Controller("/users", "v1")
export class UserController {
    @Get("/:id")
    async getUserById(@Param("id") userId: number) {
        return {id: userId};
    }

    @Post("/")
    @HttpCode(201)
    @Authorized()
    async createUser(@Body() userData: {name: string}) {
        return userData;
    }
}
```

The Fastify driver maps Node-Boot action metadata to Fastify route definitions and uses Fastify `preHandler`, `onSend`, and `onError` hooks for middleware integration.

---

### 3️⃣ Configure Fastify plugins through a Node-Boot bean

To enable Fastify-specific server plugins, provide a `SERVER_CONFIGURATIONS` bean that returns `FastifyServerConfigs`:

```typescript
import {Bean, Configuration, SERVER_CONFIGURATIONS, SERVER_CONFIGURATIONS_PROPERTY_PATH} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import {FastifyServerConfigProperties, FastifyServerConfigs} from "@nodeboot/fastify-server";

@Configuration()
export class ServerConfiguration {
    @Bean(SERVER_CONFIGURATIONS)
    public serverConfig({config, logger}: BeansContext): FastifyServerConfigs {
        logger.debug(`Resolving fastify server configuration`);

        const serverConfigs = config.getOptional<FastifyServerConfigProperties>(SERVER_CONFIGURATIONS_PROPERTY_PATH);

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
            template: {
                options: serverConfigs?.template,
            },
        };
    }
}
```

The configuration property path is `server`.

---

### 4️⃣ Provide plugin options in `app-config.yaml`

A real sample configuration looks like this:

```yaml
app:
    port: 3000

api:
    routePrefix: "/api"
    nullResultCode: 200
    undefinedResultCode: 200

server:
    cors:
        origin: "*"
        methods:
            - GET
            - POST
            - DELETE
            - PUT
        credentials: true
    multipart:
        throwFileSizeLimit: true
        limits:
            fileSize: 4096
            files: 5
```

The values under `server.*` are passed to the corresponding Fastify plugins when your `SERVER_CONFIGURATIONS` bean maps them into `FastifyServerConfigs`.

---

## ⚙️ Fastify configuration model

This package exports two useful types:

-   `FastifyServerConfigs` – the runtime bean shape consumed by the Fastify driver
-   `FastifyServerConfigProperties` – the plain configuration-properties shape typically loaded from `app-config.yaml`

Supported configuration sections are:

| Key         | Fastify plugin                     | Package              |
| ----------- | ---------------------------------- | -------------------- |
| `cookie`    | Cookie parsing/signing             | `@fastify/cookie`    |
| `cors`      | Cross-origin resource sharing      | `@fastify/cors`      |
| `session`   | Session support                    | `@fastify/session`   |
| `multipart` | File uploads / multipart form data | `@fastify/multipart` |
| `template`  | View rendering                     | `@fastify/view`      |

At runtime, the driver uses the generic `ServerConfig` helper from `@nodeboot/engine` to enable each plugin only when configured.

You can also control features explicitly in the returned bean:

```typescript
const configs: FastifyServerConfigs = {
    cors: {enabled: true, options: {origin: "*"}},
    multipart: {enabled: false},
};
```

---

## 🧩 What this package implements from `@nodeboot/engine`

`@nodeboot/engine` defines the generic `NodeBootDriver` contract. `FastifyDriver` implements that contract for Fastify by providing:

-   `initialize()` – registers configured Fastify plugins
-   `registerAction()` – converts controller metadata into Fastify routes
-   `registerMiddleware()` – binds global Node-Boot middlewares to Fastify hooks
-   `getParamFromRequest()` – resolves decorator parameters from Fastify requests
-   `handleSuccess()` – sends results, redirects, streams, buffers, or rendered views
-   `handleError()` – converts thrown errors into HTTP responses

Internally, `FastifyServer` creates a `FastifyDriver` and hands it to `NodeBootToolkit.createServer(...)`, which is how Node-Boot turns discovered controllers and middlewares into a running Fastify app.

---

## 🔐 Authorization and current user integration

Because the Fastify driver works with Fastify request/reply objects, authorization checkers can use concrete Fastify types:

```typescript
import {Action, AuthorizationChecker} from "@nodeboot/context";
import {FastifyReply, FastifyRequest} from "fastify";

export class DefaultAuthorizationResolver implements AuthorizationChecker<FastifyRequest, FastifyReply> {
    async check(_: Action<FastifyRequest, FastifyReply>, roles: string[]): Promise<boolean> {
        const user = {roles: ["USER", "ADMIN"]};
        if (!roles.length) return true;
        return roles.some(role => user.roles.includes(role));
    }
}
```

The driver calls your configured authorization checker for actions decorated with `@Authorized()`.

---

## 📨 Supported request parameter sources

The Fastify driver resolves Node-Boot action parameters from the Fastify request object, including:

-   body and body properties
-   route params
-   query params / query objects
-   headers
-   cookies
-   session values
-   uploaded file(s)

This makes decorators such as `@Body`, `@Param`, `@QueryParam`, `@QueryParams`, `@HeaderParam`, `@CookieParam`, `@Session`, `@SessionParam`, `@UploadedFile`, and `@UploadedFiles` work through the Fastify adapter.

---

## 🖼️ Responses, redirects, and templates

The Fastify driver supports common Node-Boot response patterns:

-   regular JSON/object/string responses
-   `Buffer` and `Uint8Array` responses
-   stream piping
-   `@Redirect(...)`
-   `@Render(...)` via `@fastify/view`
-   custom HTTP status codes
-   automatic `404 Not Found` for `undefined` results unless an `undefinedResultCode` is configured

If a controller returns the Fastify reply object itself, the driver short-circuits and does not send a second response.

---

## 🪝 Middleware behavior

Global and controller-level Node-Boot middlewares are mapped to Fastify hooks:

-   **before middlewares** → `preHandler`
-   **after middlewares** → `onSend`
-   **error middlewares** → `onError`

This allows Node-Boot middleware abstractions to run within the Fastify lifecycle without changing controller code.

---

## 📝 Fastify-specific runtime notes

-   `FastifyServer` creates the Fastify app with `forceCloseConnections: true` and `logger: false`
-   it logs incoming and outgoing HTTP traffic through the Node-Boot logger
-   it listens on `0.0.0.0` using the configured `app.port`
-   it decorates the Fastify request with `request.locals` for per-request state
-   `getFramework()` and `getRouter()` both return the underlying `FastifyInstance`

---

## 🔗 Relationship to other Node-Boot packages

-   **`@nodeboot/core`**: application bootstrap, decorators, DI/config integration, base server lifecycle
-   **`@nodeboot/engine`**: generic HTTP driver contract and route/middleware registration pipeline
-   **`@nodeboot/fastify-server`**: Fastify implementation of that contract

In short: `@nodeboot/core` defines the application model, `@nodeboot/engine` defines how a server driver must behave, and this package is the Fastify driver/server that makes the model run on Fastify.

---

## 📚 Exports

```typescript
import {FastifyServer, FastifyServerConfigs, FastifyServerConfigProperties} from "@nodeboot/fastify-server";
```

---

## 📄 License

MIT
