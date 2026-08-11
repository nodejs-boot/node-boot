# NodeBoot Netlify Server

Netlify Functions server package for NodeBoot framework. Provides seamless integration with Netlify's Node.js
Functions runtime while maintaining all NodeBoot features including dependency injection, middleware, routing, and
error handling.

## Features

-   **Multi-route Serverless Functions**: Handle multiple HTTP routes in a single Netlify Function
-   **Full NodeBoot Integration**: Complete support for controllers, services, middleware, and dependency injection
-   **Native Netlify Runtime**: Works directly with the `HandlerEvent`/`HandlerContext`/`HandlerResponse` types from
    `@netlify/functions`
-   **Request/Response Handling**: Automatic parsing of JSON bodies, query parameters, headers, and cookies
-   **Error Handling**: Integrated error handling with proper HTTP status codes
-   **Authorization**: Built-in authorization support using NodeBoot's authorization system

## Installation

```bash
npm install @nodeboot/netlify-server
```

## Basic Usage

### 1. Create your Netlify application

```typescript
import {NetlifyServer} from "@nodeboot/netlify-server";
import {NodeBootApplication} from "@nodeboot/core";

@EnableDI(Container)
@EnableValidations()
@EnableComponentScan()
@NodeBootApplication()
export class NetlifySampleApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(NetlifyServer);
    }
}
```

### 2. Create the Function entry point

Netlify maps files under `netlify/functions/` to routes under `/.netlify/functions/<name>` (or `/api/*` when using a
`redirects`/`netlify.toml` rewrite). Use a single catch-all function so that NodeBoot's internal router can handle
every path:

```typescript
// netlify/functions/api.ts
import {NetlifyHandler, NetlifyServer} from "@nodeboot/netlify-server";
import {NetlifySampleApp} from "../../src/app";

// Reused across warm invocations of the same execution environment.
// Only re-initialized when Netlify spins up a brand-new instance (cold start).
let netlifyHandler: NetlifyHandler | null = null;

export const handler: NetlifyHandler = async (event, context) => {
    if (!netlifyHandler) {
        const app = await new NetlifySampleApp().start();
        const netlifyServer = app.server as NetlifyServer;
        netlifyHandler = netlifyServer.getHandler();
    }

    return netlifyHandler(event, context);
};
```

Add a redirect rule in `netlify.toml` so requests to `/api/*` are routed to the function:

```toml
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api"
  status = 200
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

### 4. Deploy to Netlify

The exported `handler` function can be deployed directly as a Netlify Function - no additional configuration is
required beyond the redirect rule routing every request to the catch-all `netlify/functions/api.ts` entry point.

## Middleware Support

All NodeBoot middleware is supported:

```typescript
import {Middleware, MiddlewareInterface, Action} from "@nodeboot/core";

@Middleware({type: "before"})
export class LoggingMiddleware implements MiddlewareInterface {
    @Inject()
    private logger: Logger;

    use(action: Action, payload: any): void {
        this.logger.info(`${action.request.httpMethod} ${action.request.path}`);
    }
}
```

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

The NodeBoot Netlify Server package provides a powerful way to build serverless applications using the familiar
NodeBoot framework. With full support for routing, middleware, error handling, and authorization, you can create
robust APIs that run on Netlify Functions with ease.

## License

This project is licensed under the MIT License.
