# NodeBoot Cloudflare Server

Cloudflare Workers server package for NodeBoot framework. Provides seamless integration with the Cloudflare Workers
Fetch API while maintaining all NodeBoot features including dependency injection, middleware, routing, and error
handling.

## Features

-   **Multi-route Worker Functions**: Handle multiple HTTP routes in a single Cloudflare Worker
-   **Full NodeBoot Integration**: Complete support for controllers, services, middleware, and dependency injection
-   **Standard Fetch API**: Native support for the Web Fetch API `Request`/`Response` objects used by Cloudflare Workers
-   **Request/Response Handling**: Automatic parsing of JSON bodies, query parameters, headers, and cookies
-   **Error Handling**: Integrated error handling with proper HTTP status codes
-   **Authorization**: Built-in authorization support using NodeBoot's authorization system
-   **Environment Bindings**: Access to Worker environment bindings (KV, D1, secrets, etc.) via the action context
-   **Codegen-free routing**: Ships its own dependency-free `SimpleRouter` instead of `find-my-way`, since
    Workers' V8 isolate disallows `eval`/`new Function` (which `find-my-way` relies on internally)

## Installation

```bash
npm install @nodeboot/cloudflare-server
```

## Basic Usage

### 1. Create your NodeBoot application

```typescript
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {CloudflareServer} from "@nodeboot/cloudflare-server";
import {EnableDI} from "@nodeboot/di";
import {Container} from "typedi";

// A plain object, not a YAML file - see the note below.
const appConfig = {
    app: {name: "my-app", platform: "node-boot"},
    api: {routePrefix: "/api"},
};

/**
 * NodeBoot application entry point.
 *
 * Notice that, unlike the Express/Koa/Fastify samples, this application does not
 * "listen" on a port. Instead, it is bootstrapped once per Worker isolate (cold start)
 * and its `CloudflareServer` exposes a `fetch` handler function that the Cloudflare
 * runtime invokes for every incoming request.
 */
@EnableDI(Container)
@NodeBootApplication()
export class CloudflareSampleApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        // Cloudflare Workers have no filesystem, so `app-config.yaml`-style file-based config
        // discovery can never succeed at runtime. Pass your configuration in directly instead.
        return NodeBoot.run(CloudflareServer, appConfig);
    }
}
```

> **Note:** Unlike the Express/Koa/Fastify samples, this package does **not** support
> `@EnableComponentScan()` (it relies on `fs.readdirSync`/`require.cache`, unavailable in
> Workers). Import your controllers/services/middleware explicitly for their decorator side
> effects instead - Wrangler's esbuild bundler will include them regardless. See the
> [sample-cloudflare](../../samples/sample-cloudflare) README for the full rationale and every
> other Workers-specific caveat (routing, dependency injection, logging, etc.).

### 2. Create your Worker entry point

```typescript
import {CloudflareHandler, CloudflareServer} from "@nodeboot/cloudflare-server";
import {CloudflareSampleApp} from "./app";

// Reused across warm invocations of the same Worker isolate.
// Only re-initialized when Cloudflare spins up a brand-new isolate (cold start).
let fetchHandler: CloudflareHandler | null = null;

export default {
    async fetch(request: Request, env: Record<string, unknown>, ctx: ExecutionContext): Promise<Response> {
        if (!fetchHandler) {
            const app = await new CloudflareSampleApp().start();
            const cloudflareServer = app.server as CloudflareServer;
            fetchHandler = cloudflareServer.getHandler();
        }

        return fetchHandler(request, env, ctx);
    },
};
```

### 3. Create Controllers

```typescript
import {Controller, Get, Post, Param, Body} from "@nodeboot/core";

@Controller("/api")
export class UserController {
    @Get("/users/:id")
    getUser(@Param("id") id: string) {
        return {id, name: `User ${id}`};
    }

    @Post("/users")
    createUser(@Body() userData: any) {
        return {success: true, user: userData};
    }
}
```

### 4. Deploy to Cloudflare Workers

Bundle your Worker (e.g. with `wrangler` or `esbuild`) and deploy using [Wrangler](https://developers.cloudflare.com/workers/wrangler/):

```bash
wrangler deploy
```

## Environment Bindings

Cloudflare Workers environment bindings (KV namespaces, D1 databases, secrets, service bindings, etc.) are made
available through the `response`/execution context passed to every request, so they can be reached from middleware
and error handlers via `action.response.env`.

## Middleware Support

All NodeBoot middleware is supported:

```typescript
import {Middleware, MiddlewareInterface, Action} from "@nodeboot/core";

@Middleware({type: "before"})
export class LoggingMiddleware implements MiddlewareInterface {
    @Inject("logger")
    private logger: Logger;

    use(action: Action, payload: any): void {
        this.logger.info(`${action.request.method} ${action.request.url.pathname}`);
    }
}
```

> **Note:** Wrangler bundles your Worker with esbuild, which does not emit TypeScript decorator
> metadata. Always use explicit injection tokens (`@Inject("logger")`, `@Inject(() =>
SomeService)`) rather than bare `@Inject()`, and prefer **property injection** over constructor
> injection - without decorator metadata, TypeDI can't determine constructor arity and will
> silently fail to inject constructor parameters.

## Error Handling

Custom error handlers work seamlessly:

```typescript
import {ErrorHandler, ErrorHandlerInterface} from "@nodeboot/core";

@ErrorHandler()
export class CustomErrorHandler implements ErrorHandlerInterface {
    onError(error: any, action: Action): void {
        // Custom error handling logic
    }
}
```

## Authorization

NodeBoot's authorization system is fully supported. Use decorators like `@Authorize()` in your controllers to protect
routes.

```typescript
import {Authorize, Controller, Get} from "@nodeboot/core";

@Controller("/secure")
export class SecureController {
    @Get("/data")
    @Authorize("admin")
    getSecureData() {
        return {secret: "This is secure data"};
    }
}
```

## Conclusion

The NodeBoot Cloudflare Server package provides a powerful way to build serverless applications using the familiar
NodeBoot framework. With full support for routing, middleware, error handling, and authorization, you can create
robust APIs that run on Cloudflare Workers with ease.

## License

This project is licensed under the MIT License.
