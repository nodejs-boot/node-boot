<a name="usage-guide-top"></a>

# Node-Boot Decorators — Usage Guide

Node-Boot is built almost entirely around decorators: they are how you declare controllers, wire dependency injection, define configuration, shape HTTP responses, enable opt-in features (persistence, OpenAPI, scheduling, ...), and hook into the application lifecycle — all declaratively, without manual wiring code.

This guide documents **every decorator shipped across the Node-Boot monorepo** — core framework, context, DI, configuration, authorization, component scanning, and every starter package — explaining **why it exists**, **what problem it solves**, and **how to use it**. Sections are grouped by the package that owns the decorator, mirroring the [Architecture](./README.md#%EF%B8%8F-architecture) layers described in the root README.

## Table of Contents

-   [🧩 Core Framework (`@nodeboot/core`)](#-core-framework-nodebootcore)
    -   [Application Bootstrap](#application-bootstrap)
    -   [Dependency Injection Markers](#dependency-injection-markers)
    -   [Configuration & Beans](#configuration--beans)
    -   [Controllers & Routing](#controllers--routing)
    -   [Request Parameter Injection](#request-parameter-injection)
    -   [Response Handling](#response-handling)
    -   [Middlewares & Interceptors](#middlewares--interceptors)
    -   [Models & Validation](#models--validation)
    -   [Lifecycle Hooks](#lifecycle-hooks)
-   [🧠 Application Context (`@nodeboot/context`)](#-application-context-nodebootcontext)
-   [🔌 Dependency Injection Container (`@nodeboot/di`)](#-dependency-injection-container-nodebootdi)
-   [⚙️ Configuration Properties (`@nodeboot/config`)](#%EF%B8%8F-configuration-properties-nodebootconfig)
-   [🛡️ Authorization (`@nodeboot/authorization`)](#%EF%B8%8F-authorization-nodebootauthorization)
-   [🔍 Component Scanning (`@nodeboot/aot`)](#-component-scanning-nodebootaot)
-   [📘 OpenAPI (`@nodeboot/starter-openapi`)](#-openapi-nodebootstarter-openapi)
-   [🗄️ Persistence (`@nodeboot/starter-persistence`)](#%EF%B8%8F-persistence-nodebootstarter-persistence)
    -   [Pagination](#persistence-pagination)
-   [⏰ Scheduling (`@nodeboot/starter-scheduler`)](#-scheduling-nodebootstarter-scheduler)
-   [🌐 HTTP Clients (`@nodeboot/starter-http`)](#-http-clients-nodebootstarter-http)
-   [✅ Validation (`@nodeboot/starter-validation`)](#-validation-nodebootstarter-validation)
-   [❤️ Actuator (`@nodeboot/starter-actuator`)](#%EF%B8%8F-actuator-nodebootstarter-actuator)
-   [☁️ AWS (`@nodeboot/starter-aws`)](#%EF%B8%8F-aws-nodebootstarter-aws)
-   [🎭 Backstage (`@nodeboot/starter-backstage`)](#-backstage-nodebootstarter-backstage)
-   [⚡ Supabase (`@nodeboot/starter-supabase`)](#-supabase-nodebootstarter-supabase)
-   [🔥 Firebase (`@nodeboot/starter-firebase`)](#-firebase-nodebootstarter-firebase)
-   [🤖 OpenAI (`@nodeboot/starter-openai`)](#-openai-nodebootstarter-openai)
-   [Further Reading](#further-reading)

---

## 🧩 Core Framework (`@nodeboot/core`)

The decorators every Node-Boot application is built from: bootstrapping, DI markers, configuration, routing, request/response handling, middlewares, models, and lifecycle hooks.

### Application Bootstrap

These decorators define the shape of the application itself: its entry point, and — as an alternative to component scanning — explicit lists of controllers, middlewares, interceptors, and configurations.

<a name="nodebootapplication"></a>

#### `@NodeBootApplication(options?)`

**Purpose:** This is the root decorator of any Node-Boot app. It exists so the framework has a single, well-known place to initialize the `ApplicationContext`, collect everything registered by other decorators (`@Configuration`/`@Bean` definitions, controllers, middlewares, interceptors), and prepare the IoC container bindings that the server adapter (Express, Fastify, Koa, ...) will consume when it boots. Without it, none of the other decorators would have anywhere to register themselves. It's typically combined with one or more `@Enable...()` decorators from starter packages to opt into features like DI, OpenAPI, persistence, validation, etc.

**Example:**

```ts
@EnableDI(Container)
@EnableOpenApi()
@EnableSwaggerUI()
@EnableActuator()
@EnableRepositories()
@EnableScheduling()
@EnableHttpClients()
@EnableValidations()
@EnableComponentScan()
@NodeBootApplication()
export class GreetingsApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

<a name="controllers-list"></a>

#### `@Controllers(controllers: Function[])`

**Purpose:** By default, Node-Boot discovers controllers via component scanning (`@EnableComponentScan`). Use `@Controllers` when you'd rather be explicit about exactly which controller classes are part of the application — useful in tests, in serverless bundles where scanning is undesirable, or when you want the wiring to be visible in one place.

**Example:**

```ts
@Controllers([UserController, OrderController])
class Controllers {}
```

<a name="globalmiddlewares-list"></a>

#### `@GlobalMiddlewares(middlewares: Function[])`

**Purpose:** The explicit counterpart to `@Middleware`-based auto-registration. Use it to declare, in one place, the full list of global middlewares an application uses — helpful for predictable ordering and for environments where scanning isn't available.

**Example:**

```ts
@GlobalMiddlewares([LoggingMiddleware, ErrorMiddleware])
class Middlewares {}
```

<a name="interceptors-list"></a>

#### `@Interceptors(interceptors: Function[])`

**Purpose:** Same idea as `@GlobalMiddlewares`, but for global interceptors — classes that can inspect or transform the value returned by controller actions before it's sent as the response.

**Example:**

```ts
@Interceptors([AuditInterceptor])
class Interceptors {}
```

<a name="configurations-list"></a>

#### `@Configurations(configurationClasses: (new (...args: any[]) => any)[])`

**Purpose:** `@Configuration` classes are normally picked up automatically, but sometimes you need to force eager instantiation of a specific set of configuration classes (for example, to guarantee `@Bean` factories run in a controlled order, or outside of component scanning). This decorator instantiates each class in the list immediately.

**Example:**

```ts
@Configurations([ServerConfiguration, SecurityConfiguration])
class MultipleConfigurations {}
```

### Dependency Injection Markers

Node-Boot's IoC container needs to know which classes it's allowed to instantiate and inject. `@Component` and `@Service` are how you opt a class into that container (the actual injection mechanics live in [`@nodeboot/di`](#-dependency-injection-container-nodebootdi)).

<a name="component"></a>

#### `@Component()` / `@Component(name)` / `@Component(token)` / `@Component(options)`

**Purpose:** Marks a class as injectable, generic infrastructure — things like clients, adapters, helpers, or cross-cutting utilities that aren't strictly "business services" but still need to be constructed and injected by the DI container. Giving it a name or token lets you resolve it later by that identifier instead of by class reference, which is useful for interface-based injection or when multiple implementations exist.

**Example:**

```ts
@Component()
export class GreetingComponent {
    greet(name: string) {
        return `Hello, ${name}!`;
    }
}
```

<a name="service"></a>

#### `@Service()` / `@Service(name)` / `@Service(token)` / `@Service(options)`

**Purpose:** Functionally identical to `@Component` (both delegate to the same DI registration mechanism), but semantically communicates that the class holds business logic — the layer between controllers and data access. Use `@Service` for domain/business-logic classes and `@Component` for lower-level building blocks; this is purely a naming convention that improves code readability.

**Example:**

```ts
@Service()
export class UserService {
    async findAllUser() {
        return [];
    }
}
```

### Configuration & Beans

Node-Boot needs a way to produce objects that aren't simple `@Component`/`@Service` classes — for example, values built from external config, third-party SDK clients, or objects that depend on async initialization. `@Configuration` and `@Bean` solve exactly that, mirroring Spring's `@Configuration`/`@Bean` model.

<a name="configuration"></a>

#### `@Configuration(options?)`

**Purpose:** Marks a class as a source of bean factories. It exists to group related `@Bean` methods together (e.g. all server-related beans, or all security-related beans) and to support conditional loading: with `onConfig`, a whole configuration class can be skipped unless a given config path is present, and combined with [`@Profile`](#profile), it can be restricted to specific environments (`dev`, `test`, `prod`, ...). This lets you keep environment-specific or feature-flagged wiring out of your main application code.

**Example:**

```ts
@Configuration()
export class ServerConfiguration {
    @Bean(SERVER_CONFIGURATIONS)
    public serverConfig({config, logger}: BeansContext) {
        logger.debug("Resolving server configuration");
        return config.getOptional("server");
    }
}
```

Conditional loading based on config and profile:

```ts
@Configuration({onConfig: "feature.enabled"})
@Profile(["dev", "test"])
export class DevConfig {
    @Bean()
    devBean() {
        return new DevHelper();
    }
}
// Only loaded if config.has("feature.enabled") is true AND active profile is "dev" or "test".
```

<a name="bean"></a>

#### `@Bean(beanName?)`

**Purpose:** Marks a factory method inside a `@Configuration` class. It exists so you can construct and register objects that need custom instantiation logic — reading from config, calling an async API, wrapping a third-party client — rather than being directly decorated with `@Component`/`@Service`. The method receives a `BeansContext` (giving access to `config`, `logger`, etc.) and can be synchronous or asynchronous; the returned value is registered in the IoC container under the class/token, or under `beanName` if provided.

**Example:**

```ts
@Configuration()
export class AppConfig {
    @Bean()
    greeting() {
        return "Hello, World!";
    }

    @Bean("asyncService")
    async createService(ctx: BeansContext) {
        return new MyService(await ctx.config.get("serviceUrl"));
    }
}
```

### Controllers & Routing

These decorators define your HTTP surface: which classes handle requests, and which methods respond to which routes and verbs.

<a name="controller"></a>

#### `@Controller(baseRoute?, version?, options?)`

**Purpose:** Declares a class as an HTTP controller — the entry point that maps incoming requests to your application's logic. `baseRoute` lets you prefix every action's route (e.g. `/users`), and `version` prefixes it further for API versioning (e.g. `/v1/users`) while also recording the version as metadata (useful for OpenAPI grouping). Without `@Controller`, a class's `@Get`/`@Post`/etc. methods are inert — this decorator is what registers the class with the routing engine and (if a DI container is present) makes it injectable/constructible.

**Example:**

```ts
@Controller("/users", "v1")
export class UserController {
    constructor(private readonly user: UserService) {}

    @Get("/")
    async getUsers() {
        return this.user.findAllUser();
    }
}
```

<a name="http-method-decorators"></a>

#### HTTP Method decorators: `@Get`, `@Post`, `@Put`, `@Patch`, `@Delete`, `@Head`, `@All`, `@Method`

**Purpose:** Each of these marks a controller method as the handler for a specific HTTP verb on a given route, so the framework knows to invoke it when a matching request arrives. `@Get`/`@Post`/`@Put`/`@Patch`/`@Delete`/`@Head` are convenience wrappers for their respective verbs; `@All` matches any verb; `@Method(verb, route, options)` is the generic, lower-level form used when the HTTP verb itself needs to be computed dynamically (e.g. building a decorator factory).

**Example:**

```ts
@Controller("/users")
export class UserController {
    @Get("/:id")
    async getUserById(@Param("id") userId: number) {
        return this.user.findUserById(userId);
    }

    @Post("/")
    @HttpCode(201)
    async createUser(@Body() userData: CreateUserDto) {
        return this.user.createUser(userData);
    }

    @Put("/:id")
    async updateUser(@Param("id") userId: number, @Body() userData: UpdateUserDto) {
        return this.user.updateUser(userId, userData);
    }

    @Delete("/:id")
    async deleteUser(@Param("id") userId: number) {
        await this.user.deleteUser(userId);
    }

    @All("/ping")
    ping() {
        return {pong: true};
    }
}
```

### Request Parameter Injection

HTTP handlers need data from the incoming request — route params, query strings, headers, body, cookies, files, and so on. Rather than manually reaching into `req`/`ctx` objects, Node-Boot lets you declare exactly what a method parameter needs, and injects it for you (with optional parsing, validation, and class-transformation). This keeps controller signatures self-documenting and framework-agnostic (the same decorators work across Express, Fastify, Koa, and native HTTP).

| Decorator                        | Purpose (what it injects)                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------ |
| `@Param(name)`                   | A single route parameter (e.g. `:id`); always required, since the route wouldn't match otherwise |
| `@Params(options?)`              | All route parameters at once, as an object — useful for wildcard/catch-all routes                |
| `@QueryParam(name, options?)`    | A single query string parameter (e.g. `?name=...`)                                               |
| `@QueryParams(options?)`         | All query string parameters as an object                                                         |
| `@Body(options?)`                | The entire parsed request body — typically a DTO class                                           |
| `@BodyParam(name, options?)`     | A single field plucked out of the request body, without needing the whole DTO                    |
| `@HeaderParam(name, options?)`   | A single HTTP request header                                                                     |
| `@HeaderParams()`                | All HTTP request headers as an object                                                            |
| `@CookieParam(name, options?)`   | A single cookie value                                                                            |
| `@CookieParams()`                | All cookies as an object                                                                         |
| `@Session(options?)`             | The session object attached to the request (requires session middleware)                         |
| `@SessionParam(name, options?)`  | A single property read off the session object                                                    |
| `@State(name?)`                  | A state object attached to the request by upstream middleware                                    |
| `@UploadedFile(name, options?)`  | A single uploaded file for a given form field                                                    |
| `@UploadedFiles(name, options?)` | All uploaded files under a given form field                                                      |
| `@Req()`                         | The raw, underlying request object — an escape hatch when no other decorator fits                |
| `@Res()`                         | The raw, underlying response object — an escape hatch for manual response handling               |
| `@Ctx()`                         | The Koa `Context` object (only meaningful on the Koa server adapter)                             |

**Example:**

```ts
@Controller("/users")
export class UserController {
    @Get("/search")
    search(
        @QueryParam("name") name: string,
        @QueryParams() allQueryParams: Record<string, string>,
        @HeaderParam("x-request-id") requestId: string,
        @CookieParam("session-id") sessionId: string,
    ) {
        return this.user.search(name);
    }

    @Post("/:id/avatar")
    uploadAvatar(@Param("id") userId: number, @UploadedFile("avatar") file: Express.Multer.File) {
        return this.user.setAvatar(userId, file);
    }
}
```

Most of these decorators accept a common `options` object so you don't need extra manual parsing/validation code in the handler body:

-   `required` — throw a `400` automatically if the value is missing.
-   `parse` — JSON-parse a string value before injecting it.
-   `transform` — apply `class-transformer` to convert the raw value into a class instance.
-   `validate` — run `class-validator` against the (transformed) value before invoking the handler.
-   `type` — explicitly declare the expected type, used for transformation/validation and OpenAPI schema generation.

### Response Handling

Once a controller action returns a value, these decorators let you shape _how_ that value becomes an HTTP response — status code, headers, redirects, templates — without manually touching the response object.

<a name="httpcode"></a>

#### `@HttpCode(code)`

**Purpose:** Lets you set a specific success status code (e.g. `201 Created`, `204 No Content`) declaratively, instead of the framework's default (usually `200`). The code is only applied when the action resolves successfully — if it throws, error handling takes over instead.

**Example:**

```ts
@Post("/")
@HttpCode(201)
createUser(@Body() userData: CreateUserDto) {
    return this.user.createUser(userData);
}
```

<a name="contenttype"></a>

#### `@ContentType(contentType)`

**Purpose:** Explicitly sets the response's `Content-Type` header — useful when an action returns something other than JSON, such as CSV, plain text, or XML, and you want that reflected correctly in the response.

**Example:**

```ts
@Get("/report")
@ContentType("text/csv")
downloadReport() {
    return this.reports.generateCsv();
}
```

<a name="header"></a>

#### `@Header(name, value)`

**Purpose:** Sets an arbitrary, static response header. Useful for caching directives, custom headers, or any header not covered by a more specific decorator.

**Example:**

```ts
@Get("/")
@Header("Cache-Control", "no-store")
getUsers() {
    return this.user.findAllUser();
}
```

<a name="location"></a>

#### `@Location(url)`

**Purpose:** A focused shorthand for setting the `Location` header, most commonly used alongside `@HttpCode(201)` on creation endpoints to tell the client where the newly created resource can be found.

**Example:**

```ts
@Post("/")
@Location("/users")
@HttpCode(201)
createUser(@Body() userData: CreateUserDto) {
    return this.user.createUser(userData);
}
```

<a name="redirect"></a>

#### `@Redirect(url)`

**Purpose:** Declaratively redirects the client to another URL, so you don't have to manually call `response.redirect(...)` inside the handler body.

**Example:**

```ts
@Get("/old-path")
@Redirect("/new-path")
redirectOldPath() {}
```

<a name="render"></a>

#### `@Render(template)`

**Purpose:** For server-rendered views, this tells the framework which template to render with the object returned by the action, instead of serializing it as JSON. Requires a template engine to be configured on the underlying server adapter.

**Example:**

```ts
@Get("/home")
@Render("home.ejs")
home() {
    return {title: "Welcome"};
}
```

<a name="onnull--onundefined"></a>

#### `@OnNull(codeOrError)` / `@OnUndefined(codeOrError)`

**Purpose:** Removes the need for `if (result == null) throw ...` boilerplate in every handler. These decorators declare, at the method level, what should happen when an action's return value is `null` (`@OnNull`) or `undefined` (`@OnUndefined`): either respond with a specific HTTP status code (e.g. `404`), or throw a specific error class to be handled by your error-handling middleware.

**Example:**

```ts
@Get("/:id")
@OnUndefined(404)
getUserById(@Param("id") userId: number) {
    return this.user.findUserById(userId);
}
```

<a name="responseclasstransformoptions"></a>

#### `@ResponseClassTransformOptions(options)`

**Purpose:** Overrides the global `class-transformer` options (see [`@EnableClassTransformer`](#enableclasstransformer--friends)) for a single action's response — for example, to exclude extraneous fields or apply different serialization groups just for that endpoint, without changing the app-wide default.

**Example:**

```ts
@Get("/")
@ResponseClassTransformOptions({excludeExtraneousValues: true})
getUsers() {
    return this.user.findAllUser();
}
```

### Middlewares & Interceptors

Cross-cutting concerns — logging, auth, error handling, auditing — shouldn't be scattered across every controller. These decorators let you register that logic once, either globally or scoped to specific controllers/actions.

<a name="middleware"></a>

#### `@Middleware(options)`

**Purpose:** Marks a class as a global middleware that runs for every request. `type: "before"` runs prior to the controller action (e.g. logging, auth checks); `type: "after"` runs after the action has produced a result (e.g. response shaping, audit logging). `priority` controls the order multiple middlewares run in, which matters when one middleware depends on another having run first.

**Example:**

```ts
@Middleware({type: "before"})
export class LoggingMiddleware implements MiddlewareInterface<Request, Response> {
    @Inject()
    private logger: Logger;

    async use(action: Action<Request, Response, Function>): Promise<void> {
        this.logger.info("Incoming request");
    }
}
```

<a name="errorhandler"></a>

#### `@ErrorHandler()`

**Purpose:** A specialized `"after"` middleware whose job is exclusively to catch errors thrown anywhere in the request pipeline and turn them into a proper HTTP response. Centralizing this logic means individual controllers don't need their own try/catch blocks for standard error formatting.

**Example:**

```ts
@ErrorHandler()
export class ErrorMiddleware implements ErrorHandlerInterface<HttpError, Request, Response> {
    @Inject()
    private logger: Logger;

    async onError(error: HttpError, action: Action<Request, Response, Function>): Promise<void> {
        const {response} = action;
        response.status(error.httpCode ?? 500).json({message: error.message});
    }
}
```

<a name="interceptor"></a>

#### `@Interceptor(options?)`

**Purpose:** Registers a global interceptor — logic that runs after a controller action returns, with access to both the action and its result, so it can transform, wrap, or log that result before it's sent to the client. Unlike an "after" middleware, interceptors are specifically designed around the return value of the action. `priority` controls ordering when multiple interceptors are registered.

**Example:**

```ts
@Interceptor({priority: 1})
export class AuditInterceptor implements InterceptorInterface {
    intercept(action: Action, result: any) {
        return result;
    }
}
```

<a name="usebefore--useafter"></a>

#### `@UseBefore(...middlewares)` / `@UseAfter(...middlewares)`

**Purpose:** The scoped counterpart to `@Middleware`. Instead of running for every request in the app, these attach one or more middlewares (classes or plain functions) to a single controller (applies to all its actions) or a single action, running before/after just that scope. Useful when a concern (like auth) only applies to part of your API.

**Example:**

```ts
@Controller("/users")
@UseBefore(AuthMiddleware)
export class UserController {
    @Get("/:id")
    @UseAfter(AuditMiddleware)
    getUserById(@Param("id") userId: number) {
        return this.user.findUserById(userId);
    }
}
```

<a name="useinterceptor"></a>

#### `@UseInterceptor(...interceptors)`

**Purpose:** The scoped counterpart to `@Interceptor`. Attaches one or more interceptors (classes or inline functions) to a specific controller or action, rather than globally — handy for one-off response shaping without affecting the rest of the app.

**Example:**

```ts
@Get("/")
@UseInterceptor((action, result) => ({...result, cached: false}))
getUsers() {
    return this.user.findAllUser();
}
```

### Models & Validation

These decorators describe the shape of the data flowing through your application — request/response DTOs and domain models — so that Node-Boot (and starters like OpenAPI and validation) can generate schemas, validate payloads, and transform data automatically.

📖 **Validation library:** Runtime validation (`@IsEmail`, `@IsString`, `@IsOptional`, `@MinLength`, `@IsArray`, `@IsIn`, ...) is not implemented by Node-Boot itself — it's powered by **[`class-validator`](https://github.com/typestack/class-validator)**, applied alongside `@Property()` on the same field. Any built-in `class-validator` decorator works out of the box; see its README for the full list. Validation is only _enforced_ on incoming data once [`@EnableValidations`](#-validation-nodebootstarter-validation) is applied to the app and `validate: true` is set on the relevant param decorator (`@Body`, `@QueryParam`, ...).

When a built-in rule isn't expressive enough, you can write your own **custom validation decorator** with `class-validator`'s `registerDecorator(...)` API — it's a plain property decorator, so it composes with `@Property()`/`@Model()` exactly like a built-in one:

```ts
import {registerDecorator, ValidationArguments, ValidationOptions} from "class-validator";

export function IsValidName(validationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: "IsValidName",
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value: any) {
                    return typeof value === "string" && /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(value);
                },
                defaultMessage() {
                    return "Value must be 1-63 lowercase alphanumeric/hyphen characters, starting/ending with a letter or digit.";
                },
            },
        });
    };
}

// Usage — combine it with @Property() like any built-in validator:
@Model()
export class CreateUserDto {
    @IsValidName()
    @Property({required: true, description: "Unique, DNS-safe resource name"})
    name: string;
}
```

> See [`starters/validation`'s README](./starters/validation/README.md#custom-validators-and-validation-decorators) for the full walk-through, including how custom validators interact with `app-config.yaml` validation options.

<a name="model"></a>

#### `@Model(bindings?)`

**Purpose:** Marks a class as a first-class Node-Boot model. It exists so tooling (OpenAPI schema generation, (de)serialization) can recognize the class as a data shape worth documenting/transforming, rather than an arbitrary class. `bindings` lets you map generic property names to concrete types, useful for models with generic-like fields.

> ℹ️ [`@nodeboot/starter-openapi`](#-openapi-nodebootstarter-openapi) exports its own `@Model` that behaves identically but is additionally responsible for wiring the class into OpenAPI schema generation — import it from `@nodeboot/starter-openapi` when using OpenAPI.

**Example:**

```ts
@Model()
export class UserModel {
    @Property({description: "User ID"})
    id: string;

    @Property({description: "User email address"})
    @IsEmail()
    email: string;
}
```

<a name="property"></a>

#### `@Property(options?)`

**Purpose:** Marks an individual field of a `@Model` class as a documented model property. It exists because plain TypeScript types are erased at runtime — `@Property` captures the field's design-time type plus extra metadata (`name`, `required`, `description`, explicit `type`) so it can be used for OpenAPI schema generation and runtime validation/transformation, working alongside `class-validator` decorators like `@IsEmail()`/`@IsString()`.

**Example:**

```ts
@Model()
export class CreateUserDto {
    @Property({description: "User email address"})
    @IsEmail()
    email: string;

    @Property({description: "User name", required: false})
    @IsString()
    @IsOptional()
    name?: string;
}
```

<a name="enableclasstransformer--friends"></a>

#### `@EnableClassTransformer(options?)` / `@ClassToPlainTransform(options)` / `@PlainToClassTransform(options)`

**Purpose:** Controls whether and how `class-transformer` is applied application-wide when converting between plain request/response payloads and class instances. `@EnableClassTransformer` turns this behavior on (and can set both directions' options at once); `@ClassToPlainTransform`/`@PlainToClassTransform` let you fine-tune the `ClassTransformOptions` used specifically for outgoing (`classToPlain`) or incoming (`plainToClass`) conversions, independently of each other.

**Example:**

```ts
@EnableClassTransformer({enabled: true})
class Transformation {}
```

### Lifecycle Hooks

<a name="postconstruct"></a>

#### `@PostConstruct()`

**Purpose:** Constructor injection alone isn't always enough — sometimes initialization logic needs to run _after_ all dependencies have been injected (e.g. warming a cache, opening a connection using an injected config service). `@PostConstruct` marks a method to be invoked automatically right after the DI container finishes constructing and wiring an instance, so that setup logic doesn't have to live awkwardly inside the constructor.

**Example:**

```ts
@Service()
export class CacheWarmer {
    @Inject()
    private cache: CacheService;

    @PostConstruct()
    async init() {
        await this.cache.warmUp();
    }
}
```

> 📖 **Full documentation:** [`@nodeboot/core` README](./packages/core/README.md)

<p align="right">(<a href="#usage-guide-top">back to top</a>)</p>

---

## 🧠 Application Context (`@nodeboot/context`)

Cross-cutting decorators that shape how and when application-level features are wired, independent of any single package. These live in `@nodeboot/context` because they operate on the shared `ApplicationContext`/lifecycle machinery consumed by both core and starters.

<a name="shutdownhook"></a>

### `@ShutdownHook(options?)`

**Purpose:** Graceful shutdown is easy to forget and hard to get right by hand (closing DB connections, flushing caches, handling `SIGINT`/`SIGTERM`/`SIGUSR2`, uncaught exceptions...). `@ShutdownHook` marks a method to be executed automatically during application shutdown, hot reload, or process termination, with support for execution `priority` (higher runs first) and a `timeout` for the cleanup operation, so a hanging cleanup can't block process exit forever.

**Example:**

```ts
@Service()
class DatabaseService {
    private connection: Connection;

    @ShutdownHook({priority: 100, timeout: 5000})
    async closeConnection() {
        await this.connection.close();
        console.log("Database connection closed");
    }
}

@Service()
class CacheService {
    private cache: RedisClient;

    @ShutdownHook({priority: 50})
    async flushCache() {
        await this.cache.flushall();
        await this.cache.quit();
    }
}
```

<a name="lifecycle"></a>

### `@Lifecycle(type)`

**Purpose:** Some application features need to hook into a specific moment of the app's boot/shutdown sequence rather than just "on construction". `@Lifecycle` associates a class implementing `ApplicationFeatureAdapter` with a named phase — `"application.initialized"`, `"application.started"`, `"persistence.started"`, or `"application.stopped"` — so the runtime knows exactly when to invoke it (e.g. running DB migrations once persistence is ready, or warming caches once the app is fully started).

**Example:**

```ts
// Run when persistence layer starts
@Lifecycle("persistence.started")
export class MigrationRunnerFeature implements ApplicationFeatureAdapter {
    async bind(context: ApplicationFeatureContext) {
        await runMigrations();
    }
}

// Run during graceful shutdown
@Lifecycle("application.stopped")
export class CleanupFeature implements ApplicationFeatureAdapter {
    async bind(context: ApplicationFeatureContext) {
        await cleanupResources();
    }
}
```

<a name="profile"></a>

### `@Profile(profiles: string[])`

**Purpose:** Real applications need different wiring per environment (dev/test/prod, or per deployment target). `@Profile` lets you tag a controller, service, or `@Configuration` class with one or more profile names; it will only be registered/instantiated if at least one of those names matches the active profiles (set via the `NODE_BOOT_ACTIVE_PROFILES` environment variable, e.g. `export NODE_BOOT_ACTIVE_PROFILES=kubernetes,v2`). This keeps environment-specific classes out of the default load path without `if` statements scattered through your code.

**Example:**

```ts
// Restrict a controller to the "http" profile only
@Profile(["http"])
@Controller("/users")
export class UserController {}

// Load a bean only if the "datadog" profile is active
@Profile(["datadog"])
@Configuration()
export class DevDatabaseConfig {
    @Bean()
    public databaseConnection(): DatabaseConnection {
        return new DatabaseConnection("dev-db-url");
    }
}
```

> 📖 **Full documentation:** [`@nodeboot/context` README](./packages/context/README.md)

<p align="right">(<a href="#usage-guide-top">back to top</a>)</p>

---

## 🔌 Dependency Injection Container (`@nodeboot/di`)

The low-level DI mechanics that power `@Component`/`@Service` registration and constructor/property injection.

<a name="enabledi"></a>

### `@EnableDI(iocContainer, options?)`

**Purpose:** Node-Boot doesn't ship its own IoC container implementation — it's container-agnostic by design. `@EnableDI` tells the framework which container to actually use (e.g. `typedi`'s `Container`) and lets you pass extra container options. Without it, `@Component`/`@Service`/`@Inject` metadata is recorded but nothing gets instantiated or injected.

**Example:**

```ts
import {Container} from "typedi";

@EnableDI(Container)
@NodeBootApplication()
export class SampleApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

<a name="inject"></a>

### `@Inject()` / `@Inject(type)` / `@Inject(name)` / `@Inject(token)`

**Purpose:** While constructor parameters are injected automatically based on their TypeScript type, `@Inject` is needed whenever the container can't infer the dependency on its own — injecting by string name/token (e.g. a config bean registered under `"app-config"`), injecting an abstract type/interface, or injecting into a class property instead of a constructor parameter.

**Example:**

```ts
export class UserController {
    constructor(
        private readonly user: UserService,
        @Inject("app-config")
        private readonly appConfigProperties: AppConfigProperties,
    ) {}
}

export class LoggingMiddleware {
    @Inject()
    private logger: Logger;
}
```

> 📖 **Full documentation:** [`@nodeboot/di` README](./packages/di/README.md)

<p align="right">(<a href="#usage-guide-top">back to top</a>)</p>

---

## ⚙️ Configuration Properties (`@nodeboot/config`)

<a name="configurationproperties"></a>

### `@ConfigurationProperties({configPath, configName})`

**Purpose:** Reading individual config values with `config.get("some.path.value")` scattered through the codebase is error-prone and hard to type. `@ConfigurationProperties` lets you bind an entire config subtree (identified by `configPath`) onto a plain class, and registers an instance of that class in the IoC container under `configName` — so the rest of your application can simply `@Inject("configName")` a strongly-typed configuration object instead of touching the raw config service.

**Example:**

Given the following `app` section in your app's `app-config.yaml`:

```yaml
# app-config.yaml
app:
    name: "facts-service"
    platform: "tech-insights"
    environment: "development"
    defaultErrorHandler: false
    port: 3000
```

Bind that `app` section (`configPath: "app"`) onto a class, and register it in the container under the `"app-config"` bean name (`configName: "app-config"`). The class's field names must match the YAML keys under `configPath`:

```ts
import {ConfigurationProperties} from "@nodeboot/config";

@ConfigurationProperties({configPath: "app", configName: "app-config"})
export class AppConfigProperties {
    name: string;
    platform: string;
    environment: string;
    defaultErrorHandler: boolean;
    port: number;
}
```

Then inject the bean by name anywhere in the application, fully typed:

```ts
export class UserController {
    constructor(
        @Inject("app-config")
        private readonly appConfigProperties: AppConfigProperties,
    ) {}

    @Get("/")
    async getUsers() {
        return `Running on ${this.appConfigProperties.name}:${this.appConfigProperties.port}`;
    }
}
```

> 📖 **Full documentation:** [`@nodeboot/config` README](./packages/config/README.md) — also covers reading individual values with `ConfigService`, nested configuration, environment placeholders (`${ENV_VAR}`), and `$include`-based local overrides.

<p align="right">(<a href="#usage-guide-top">back to top</a>)</p>

---

## 🛡️ Authorization (`@nodeboot/authorization`)

Decorators for restricting access to routes and injecting the authenticated user, without hard-coding auth logic in every controller.

<a name="enableauthorization"></a>

### `@EnableAuthorization(currentUserCheckerClass?, authorizationCheckerClass?)`

**Purpose:** `@Authorized`/`@CurrentUser` only declare _where_ authorization applies — the actual "who is the current user" and "is this user allowed" logic has to live somewhere. `@EnableAuthorization`, applied to the application entry point, registers the classes that implement that logic (`CurrentUserChecker`/`AuthorizationChecker`), so the framework knows what to call when it encounters `@Authorized`/`@CurrentUser`.

**Example:**

```ts
@EnableAuthorization(CurrentUserCheckerService, AuthorizationCheckerService)
@NodeBootApplication()
export class SampleApp implements NodeBootApp {}
```

<a name="authorized"></a>

### `@Authorized()` / `@Authorized(role)` / `@Authorized(roles)`

**Purpose:** Marks a controller class or action as requiring authorization, optionally restricted to specific role(s). The actual check is delegated to the `AuthorizationChecker` registered via `@EnableAuthorization` — this decorator just marks _where_ the check should be enforced, keeping access-control declarations next to the routes they protect.

**Example:**

```ts
@Post("/")
@HttpCode(201)
@Authorized()
async createUser(@Body() userData: CreateUserDto) {
    return this.user.createUser(userData);
}

@Delete("/:id")
@Authorized(["admin"])
async deleteUser(@Param("id") userId: number) {
    await this.user.deleteUser(userId);
}
```

<a name="currentuser"></a>

### `@CurrentUser(options?)`

**Purpose:** Injects the currently authenticated user (as resolved by the `CurrentUserChecker` registered via `@EnableAuthorization`) directly into a controller action parameter, so handlers don't need to manually pull the user off the request/session.

**Example:**

```ts
@Get("/me")
getProfile(@CurrentUser({required: true}) user: User) {
    return user;
}
```

> 📖 **Full documentation:** [`@nodeboot/authorization` README](./packages/authorization/README.md)

<p align="right">(<a href="#usage-guide-top">back to top</a>)</p>

---

## 🔍 Component Scanning (`@nodeboot/aot`)

<a name="enablecomponentscan"></a>

### `@EnableComponentScan(options?)`

**Purpose:** Manually listing every controller/service/configuration class (via `@Controllers`, `@GlobalMiddlewares`, etc.) doesn't scale as an app grows. `@EnableComponentScan` automatically discovers and imports all classes decorated with known Node-Boot decorators (`@Controller`, `@Service`, ...), either by reading a prebuilt bean manifest (`node-boot-beans.json`, generated ahead-of-time for fast production startup) or by falling back to a recursive filesystem scan in development. `options.customDecorators` lets you extend scanning to recognize your own custom decorators too.

**Example:**

```ts
@EnableDI(Container)
@EnableComponentScan()
@NodeBootApplication()
export class MyApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

> 📖 **Full documentation:** [`@nodeboot/aot` README](./packages/aot/README.md)

<p align="right">(<a href="#usage-guide-top">back to top</a>)</p>

---

## 📘 OpenAPI (`@nodeboot/starter-openapi`)

Generates an OpenAPI specification straight from your existing `@Controller`/`@Model`/`@Property` decorators, and optionally serves an interactive Swagger UI — no separate schema files to maintain by hand.

Once enabled, the following endpoints are exposed by your running service:

| Endpoint                     | Enabled by           | Description                                           |
| ---------------------------- | -------------------- | ----------------------------------------------------- |
| `GET /api-docs/swagger.json` | `@EnableOpenApi()`   | The generated OpenAPI 3 spec, as JSON.                |
| `GET /api-docs`              | `@EnableSwaggerUI()` | Interactive Swagger UI, rendered from the spec above. |

On bootstrap, Node-Boot logs both URLs so you can jump straight to them:

```
=====> 🌈 Swagger UI is Live :) = http://localhost:3000/api-docs
=====> 🔌 OpenAPI Spec is Live :) = http://localhost:3000/api-docs/swagger.json
```

<a name="enableopenapi"></a>

### `@EnableOpenApi()`

**Purpose:** Turns on automatic OpenAPI spec generation for the application. Applied to the entry-point class, it inspects all registered controllers/actions/models and exposes the resulting spec at `/api-docs/swagger.json`. Supported on Express, Fastify, Koa, Hono, and native HTTP server adapters. Spec metadata (`info`, `servers`, `externalDocs`, `securitySchemes`, ...) can be customized via the `openapi` section of `app-config.yaml`.

**Example:**

```ts
@EnableOpenApi()
@NodeBootApplication()
export class SampleApp implements NodeBootApp {}
```

<a name="enableswaggerui"></a>

### `@EnableSwaggerUI()`

**Purpose:** Complements `@EnableOpenApi` by registering a route that serves an interactive Swagger UI (at `/api-docs`), rendered from the spec generated by `@EnableOpenApi`. Without `@EnableOpenApi`, there's no spec for it to display.

**Example:**

```ts
@EnableOpenApi()
@EnableSwaggerUI()
@NodeBootApplication()
export class SampleApp implements NodeBootApp {}
```

<a name="openapi-model"></a>

### `@Model(bindings?)` _(OpenAPI variant)_

**Purpose:** Same core purpose as [`@nodeboot/core`'s `@Model`](#model) — marking a class as a documented data shape — but this variant, imported from `@nodeboot/starter-openapi`, is the one that plugs directly into OpenAPI schema generation (component schemas under `#/components/schemas/...`). `@ResponseSchema` will auto-apply this decorator if you forget it.

**Example:**

```ts
import {Model} from "@nodeboot/starter-openapi";

@Model()
export class UserModel {
    @Property({description: "User ID"})
    id: string;
}
```

<a name="openapi-decorator"></a>

### `@OpenAPI(spec)`

**Purpose:** The generated OpenAPI operation object from your route/param decorators is a good starting point, but sometimes you need to add or override specific OpenAPI keywords (summaries, descriptions, extra parameters, security requirements, ...) that Node-Boot has no decorator for. `@OpenAPI` lets you merge an arbitrary partial `OperationObject` (or a function that transforms the existing one) into the generated spec for a controller or action.

**Example:**

```ts
@Get("/:id")
@OpenAPI({summary: "Return find a user"})
@ResponseSchema(UserModel)
async getUserById(@Param("id") userId: number) {
    return this.user.findUserById(userId);
}
```

<a name="responseschema"></a>

### `@ResponseSchema(responseClass, options?)`

**Purpose:** Documents the shape of a controller action's response in the generated OpenAPI spec, referencing a `@Model`-decorated class (auto-applying `@Model` if missing) or a primitive type string. `options` lets you control `isArray`, `statusCode`, `contentType`, and `description`, and supports multiple response schemas under the same status code (merged as `oneOf`). This is what makes your generated docs actually describe response bodies, not just request shapes.

**Example:**

```ts
@Get("/")
@ResponseSchema(UserModel, {isArray: true, description: "Return a list of users"})
async getUsers(): Promise<UserModel[]> {
    return this.user.findAllUser();
}
```

> 📖 **Full documentation:** [`@nodeboot/starter-openapi` README](./starters/openapi/README.md)

<p align="right">(<a href="#usage-guide-top">back to top</a>)</p>

---

## 🗄️ Persistence (`@nodeboot/starter-persistence`)

TypeORM-backed persistence support: repositories, transactions, migrations, entity events, custom caching, and naming strategies, wired automatically into the DI container.

<a name="enablerepositories"></a>

### `@EnableRepositories()`

**Purpose:** The single switch that turns on the whole persistence layer. Applied to the application entry point, it activates the persistence feature flag, registers the default repositories adapter, and triggers resolution of query-cache, datasource, persistence, and transaction configuration — all the plumbing that `@DataRepository`, `@Transactional`, `@Migration`, etc. depend on.

**Example:**

```ts
@EnableRepositories()
@NodeBootApplication()
export class SampleApplication implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

<a name="datarepository"></a>

### `@DataRepository(entity)`

**Purpose:** Marks a class as a TypeORM-backed repository for a given entity, and registers it with the persistence context so it can be injected via DI like any other component. It validates that the class actually extends one of TypeORM's `Repository`, `MongoRepository`, or `TreeRepository` base classes, catching a common integration mistake early (at decoration time) rather than at runtime.

Node-Boot recognizes the following parent repository classes — extend one of these, then apply `@DataRepository(Entity)` on top:

| Parent class                         | Source                          | Backing store                      | Adds                                                                                                                                                                          |
| ------------------------------------ | ------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Repository<T>`                      | TypeORM                         | SQL (Postgres, MySQL, SQLite, ...) | Standard TypeORM repository API (`find`, `save`, `createQueryBuilder`, ...).                                                                                                  |
| `MongoRepository<T>`                 | TypeORM                         | MongoDB                            | Standard TypeORM Mongo repository API, plus native MongoDB query operators.                                                                                                   |
| `TreeRepository<T>`                  | TypeORM                         | SQL                                | Tree-structure operations (`findTrees`, `findAncestors`, `findDescendants`, ...) for adjacency-list/closure-table entities.                                                   |
| `PagingAndSortingRepository<T>`      | `@nodeboot/starter-persistence` | SQL                                | Everything `Repository<T>` has, **plus** `findPaginated(...)` (offset-based) and `findCursorPaginated(...)` (cursor-based) — see [Pagination](#persistence-pagination) below. |
| `MongoPagingAndSortingRepository<T>` | `@nodeboot/starter-persistence` | MongoDB                            | Everything `MongoRepository<T>` has, **plus** `findById(...)`, `findPaginated(...)`, and `findCursorPaginated(...)` — see [Pagination](#persistence-pagination) below.        |

**Example:**

```ts
@DataRepository(User)
export class UserRepository extends Repository<User> {}
```

<a name="transactional"></a>

### `@Transactional(options?)`

**Purpose:** Ensures a service method's database operations run atomically, as a single transaction, without manually managing a `QueryRunner`/commit/rollback in every method. Built on `typeorm-transactional`, it supports configuring `propagation` (e.g. `REQUIRED` vs `REQUIRES_NEW`), `isolationLevel`, and which connection to use — the same propagation semantics you'd expect from Spring's `@Transactional`.

**Example:**

```ts
class UserService {
    @Transactional()
    async createUser(name: string): Promise<User> {
        // All operations here are part of the same transaction
        const user = new User();
        user.name = name;
        return await this.userRepository.save(user);
    }
}
```

<a name="datasourceconfiguration"></a>

### `@DatasourceConfiguration(options)`

**Purpose:** By default, datasource connection options come from your app's configuration files. `@DatasourceConfiguration` lets you override those defaults programmatically on a plain class — useful for tests, for computing connection options dynamically, or for apps that don't want to rely on config files for the datasource.

**Example:**

```ts
@DatasourceConfiguration({
    type: "postgres",
    host: "localhost",
    port: 5432,
    username: "user",
    password: "pass",
    database: "mydb",
})
class MyCustomDatasourceConfig {}
```

<a name="persistencenamingstrategy"></a>

### `@PersistenceNamingStrategy()`

**Purpose:** Lets you plug in a custom TypeORM `NamingStrategyInterface` implementation (e.g. to enforce `snake_case` table/column names, or a custom prefixing convention) as the strategy used across the whole persistence layer, instead of relying on TypeORM's default.

**Example:**

```ts
@PersistenceNamingStrategy()
class CustomNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
    tableName(className: string, customName: string): string {
        return customName ? customName.toLowerCase() : className.toLowerCase();
    }
}
```

<a name="persistencecache"></a>

### `@PersistenceCache()`

**Purpose:** Registers a custom `QueryResultCache` implementation (e.g. backed by Redis) as the active query-cache provider for the persistence layer, replacing TypeORM's built-in caching. The class is also DI-decorated, so it can inject its own dependencies (like a Redis client).

**Example:**

```ts
@PersistenceCache()
class CustomQueryCache extends QueryResultCache {
    // custom cache implementation
}
```

<a name="migration"></a>

### `@Migration()`

**Purpose:** Registers a TypeORM `MigrationInterface` class with the persistence context so it's picked up as part of the application's migration lifecycle, instead of relying purely on the TypeORM CLI's file-discovery conventions.

**Example:**

```ts
@Migration()
class AddUsersTable1616161616161 implements MigrationInterface {
    async up(queryRunner: QueryRunner): Promise<void> {
        // migration logic here
    }
    async down(queryRunner: QueryRunner): Promise<void> {
        // rollback logic here
    }
}
```

<a name="entityeventsubscriber"></a>

### `@EntityEventSubscriber()`

**Purpose:** Registers a class implementing TypeORM's `EntitySubscriberInterface` (for reacting to entity lifecycle events — `beforeInsert`, `afterUpdate`, `beforeRemove`, etc.) as an active subscriber in the persistence context, on top of applying TypeORM's own `@EventSubscriber()` decorator. Use it for cross-cutting entity concerns like audit trails, cache invalidation, or search-index syncing.

**Example:**

```ts
@EntityEventSubscriber()
class UserSubscriber implements EntitySubscriberInterface<User> {
    listenTo() {
        return User;
    }
    afterInsert(event: InsertEvent<User>) {
        console.log(`User created: ${event.entity.id}`);
    }
}
```

<a name="persistence-pagination"></a>

### Pagination

**Purpose:** Almost every "list" endpoint eventually needs pagination, but hand-rolling `LIMIT`/`OFFSET` (or cursor) logic, sorting, and count queries on top of TypeORM is repetitive and easy to get subtly wrong — especially cursor-based pagination. Instead of a decorator, this is a **repository base class** (`PagingAndSortingRepository<T>` for SQL, `MongoPagingAndSortingRepository<T>` for MongoDB — see the table above) that adds ready-to-use paging methods to any `@DataRepository`, so you only have to wire the repository, service, controller, and OpenAPI response schema together.

**1. Repository** — extend the paging base class instead of the plain `Repository`/`MongoRepository`:

```ts
import {DataRepository, MongoPagingAndSortingRepository} from "@nodeboot/starter-persistence";
import {User} from "../entities";

@DataRepository(User)
export class PagingUserRepository extends MongoPagingAndSortingRepository<User> {}
```

**2. Models** — reuse Node-Boot's generic `Page<T>`/`CursorPage<T>` wrappers around your entity's response model, decorated so OpenAPI can generate a concrete (non-generic) schema for them:

```ts
import {Page, CursorPage} from "@nodeboot/core";
import {Model} from "@nodeboot/starter-openapi";
import {UserModel} from "./UserModel";

@Model({T: UserModel})
export class UserPage extends Page<UserModel> {}

@Model({T: UserModel})
export class CursorUserPage extends CursorPage<UserModel> {}
```

**3. Controller** — inject the repository directly (or wrap it in a service) and expose both pagination styles, documenting each with `@ResponseSchema`:

```ts
import {Controller, CursorRequest, Get, PagingRequest, QueryParams} from "@nodeboot/core";
import {ResponseSchema} from "@nodeboot/starter-openapi";
import {PagingUserRepository} from "../persistence";
import {UserPage} from "../models/UserPage";
import {CursorUserPage} from "../models/CursorUserPage";

@Controller("/paging", "v1")
export class PagingUserController {
    constructor(private readonly userRepository: PagingUserRepository) {}

    @Get("/paginated")
    @ResponseSchema(UserPage)
    async getUsersPaginated(@QueryParams() paging: PagingRequest): Promise<UserPage> {
        return this.userRepository.findPaginated({}, paging);
    }

    @Get("/cursor")
    @ResponseSchema(CursorUserPage)
    async getUsersCursorPaginated(@QueryParams() cursorRequest: CursorRequest): Promise<CursorUserPage> {
        return this.userRepository.findCursorPaginated({}, cursorRequest);
    }
}
```

`PagingRequest` (`page`, `pageSize`, `sortField`, `sortOrder`) and `CursorRequest` (`pageSize`, `cursor`/`lastId`, `sortField`, `sortOrder`) are both `@Model`-decorated in `@nodeboot/core`, so `@QueryParams()` binds query-string parameters straight onto them, and they show up correctly as documented query parameters in the generated OpenAPI spec.

Calling `GET /v1/paging/paginated?page=1&pageSize=10&sortField=id&sortOrder=DESC` then returns a fully-typed, OpenAPI-documented page:

```json
{
    "page": 1,
    "pageSize": 10,
    "totalItems": 42,
    "totalPages": 5,
    "items": [{"id": "1", "email": "user@example.com"}]
}
```

> 📖 **Full documentation:** [`@nodeboot/starter-persistence` README](./starters/persistence/README.md)

<p align="right">(<a href="#usage-guide-top">back to top</a>)</p>

---

## ⏰ Scheduling (`@nodeboot/starter-scheduler`)

<a name="enablescheduling"></a>

### `@EnableScheduling()`

**Purpose:** Activates the scheduling feature for the application and registers shutdown hooks so scheduled tasks are cleanly stopped on shutdown. Without this on the entry-point class, `@Scheduler`-decorated methods are registered as metadata but never actually run.

**Example:**

```ts
@EnableScheduling()
@NodeBootApplication()
export class SampleApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

<a name="scheduler"></a>

### `@Scheduler(cronExpression)`

**Purpose:** Schedules a method on a `@Service`/`@Component` to run automatically according to a cron expression — background jobs like cache refreshes, cleanup tasks, or periodic syncs — without wiring up a separate cron library or job runner yourself. Duplicate scheduling of the exact same class/method/expression is automatically prevented.

**Example:**

```ts
@Service()
class MyScheduledService {
    constructor(private readonly logger: Logger) {}

    @Scheduler("0 * * * *") // Runs every hour
    runTask() {
        this.logger.info("Executing scheduled task...");
    }
}
```

> 📖 **Full documentation:** [`@nodeboot/starter-scheduler` README](./starters/scheduler/README.md)

<p align="right">(<a href="#usage-guide-top">back to top</a>)</p>

---

## 🌐 HTTP Clients (`@nodeboot/starter-http`)

<a name="enablehttpclients"></a>

### `@EnableHttpClients()`

**Purpose:** Turns on the HTTP client feature for the application. Required before any `@HttpClient`-decorated class will actually be wired up and usable.

**Example:**

```ts
@EnableDI(Container)
@EnableHttpClients()
@NodeBootApplication()
export class SampleBackendApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

<a name="httpclient"></a>

### `@HttpClient(config, plugins?)`

**Purpose:** Declares a class as a typed HTTP client for calling an external/internal API, backed by Axios. Instead of instantiating and configuring an Axios instance by hand in every service that needs to call out to another API, you extend `HttpClientStub` and decorate the class with connection config (`baseURL`, `timeout`, headers, request/response logging) — the config can also be a config-properties path, so client settings can live in your app's configuration files. `plugins` allows attaching extra behavior like rate limiting.

**Example:**

```ts
@HttpClient({
    baseURL: "https://jsonplaceholder.typicode.com",
    timeout: 5000,
    httpLogging: true,
})
export class MicroserviceHttpClient extends HttpClientStub {}

@HttpClient(`${integrations.http.sampleapi}`)
export class ServiceHttpClient extends HttpClientStub {}
```

> 📖 **Full documentation:** [`@nodeboot/starter-http` README](./starters/http/README.md)

<p align="right">(<a href="#usage-guide-top">back to top</a>)</p>

---

## ✅ Validation (`@nodeboot/starter-validation`)

<a name="enablevalidations"></a>

### `@EnableValidations()`

**Purpose:** Activates automatic request validation (via `class-validator`) for the application, registering `ValidationsConfiguration`. Once enabled, DTOs decorated with `class-validator` decorators (`@IsEmail()`, `@IsString()`, `@MinLength()`, ...) and injected via `@Body`/`@BodyParam`/etc. are validated before the handler runs, rejecting invalid requests automatically instead of requiring manual checks in every action.

**Example:**

```ts
@EnableValidations()
@NodeBootApplication()
export class SampleApp implements NodeBootApp {}
```

```ts
export class CreateUserDto {
    @IsEmail()
    email: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(9)
    @MaxLength(32)
    password: string;
}
```

> 📖 **Full documentation:** [`@nodeboot/starter-validation` README](./starters/validation/README.md)

<p align="right">(<a href="#usage-guide-top">back to top</a>)</p>

---

## ❤️ Actuator (`@nodeboot/starter-actuator`)

<a name="enableactuator"></a>

### `@EnableActuator()`

**Purpose:** Adds Spring Boot Actuator–style operational endpoints (health checks, application info, metrics) to your app, without you having to hand-write monitoring routes. Applied to the entry-point class, it registers the default actuator adapter that exposes these endpoints. Supported on Express, Fastify, Koa, Hono, and native HTTP.

**Example:**

```ts
@EnableActuator()
@NodeBootApplication()
export class SampleApp implements NodeBootApp {}
```

Once enabled, the following endpoints are exposed (base path `/actuator`):

| Endpoint                         | Description                                                                                           |
| -------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `GET /actuator`                  | Lists all available actuator endpoints.                                                               |
| `GET /actuator/info`             | Runtime info: hostname, Node version, load average, uptime, active profiles, build info.              |
| `GET /actuator/git`              | Git branch/commit metadata, read from a `git.properties` file.                                        |
| `GET /actuator/config`           | The fully resolved application configuration (⚠️ sensitive — see the package README's security note). |
| `GET /actuator/memory`           | Memory diagnostics: `os.freemem/totalmem`, `process.memoryUsage()`, V8 heap statistics.               |
| `GET /actuator/metrics`          | All registered Prometheus metrics, as JSON.                                                           |
| `GET /actuator/prometheus`       | All registered Prometheus metrics, in Prometheus text exposition format.                              |
| `GET /actuator/controllers`      | Introspection of all registered Node-Boot controllers, routes, and actions.                           |
| `GET /actuator/interceptors`     | Introspection of all registered interceptors.                                                         |
| `GET /actuator/middlewares`      | Introspection of all registered middlewares.                                                          |
| `GET /actuator/health`           | Combined readiness + liveness payload, plus links to the individual endpoints below.                  |
| `GET /actuator/health/readiness` | `200` once the app (and persistence layer, if enabled) has finished starting; `503` otherwise.        |
| `GET /actuator/health/liveness`  | Always `200 {"status": "ok"}` while the process is running — suitable for basic liveness probes.      |

On bootstrap, Node-Boot logs the actuator and Prometheus URLs so you can jump straight to them:

```
=====> 🏭 Actuator is Active :) = http://localhost:3000/actuator
=====> 🚥 Prometheus monitoring endpoint is live :) = http://localhost:3000/actuator/prometheus
```

> 📖 **Full documentation:** [`@nodeboot/starter-actuator` README](./starters/actuator/README.md)

<p align="right">(<a href="#usage-guide-top">back to top</a>)</p>

---

## ☁️ AWS (`@nodeboot/starter-aws`)

<a name="enableaws"></a>

### `@EnableAws()`

**Purpose:** Bootstraps auto-configuration for common AWS service clients — DynamoDB, S3, Secrets Manager, SQS, and SNS — based on your application configuration, so you don't need to hand-construct and register each AWS SDK client yourself.

**Example:**

```ts
@EnableAws()
@NodeBootApplication()
export class SampleApp implements NodeBootApp {}
```

<a name="sqslistener"></a>

### `@SqsListener(queueUrlOrConfigPlaceholder)`

**Purpose:** Declares a method as the handler for messages arriving on a given SQS queue, turning polling/handling boilerplate into a single decorator. The queue can be given as a literal URL or as a config placeholder, so the actual queue URL can differ per environment.

**Example:**

```ts
@Service()
class OrderEventsListener {
    @SqsListener("https://sqs.eu-west-1.amazonaws.com/123456789012/orders-queue")
    async onMessage(message: SQSMessage) {
        // process the message
    }
}
```

> 📖 **Full documentation:** [`@nodeboot/starter-aws` README](./starters/aws/README.md)

<p align="right">(<a href="#usage-guide-top">back to top</a>)</p>

---

## 🎭 Backstage (`@nodeboot/starter-backstage`)

<a name="enablebackstage"></a>

### `@EnableBackstage()`

**Purpose:** Wires up Backstage.io integration (e.g. exposing `catalog-info.yaml`-compatible metadata/endpoints) by instantiating `BackstageConfiguration` when applied to the application entry point — useful for organizations that track their services in a Backstage software catalog.

**Example:**

```ts
@EnableDI(Container)
@EnableBackstage()
@NodeBootApplication()
export class SampleApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

> 📖 **Full documentation:** [`@nodeboot/starter-backstage` README](./starters/backstage/README.md)

<p align="right">(<a href="#usage-guide-top">back to top</a>)</p>

---

## ⚡ Supabase (`@nodeboot/starter-supabase`)

<a name="enablesupabase"></a>

### `@EnableSupabase()`

**Purpose:** Registers `SupabaseConfiguration`, which initializes a Supabase client from your application's configuration and makes it available for injection (as `supabase.client`) throughout the app — so services can use Supabase's auth/database/storage APIs without manually constructing the client.

**Example:**

```ts
@EnableDI(Container)
@EnableSupabase()
@NodeBootApplication()
export class MyApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

> 📖 **Full documentation:** [`@nodeboot/starter-supabase` README](./starters/supabase/README.md)

<p align="right">(<a href="#usage-guide-top">back to top</a>)</p>

---

## 🔥 Firebase (`@nodeboot/starter-firebase`)

<a name="enablefirebase"></a>

### `@EnableFirebase()`

**Purpose:** Registers `FirebaseAdminConfiguration`, initializing Firebase Admin services (auth, Firestore, etc.) based on the application's configuration, and exposes them as injectable beans (e.g. `firebase.auth`, `firebase.firestore`) — removing manual Firebase Admin SDK initialization from application code.

**Example:**

```ts
@EnableDI(Container)
@EnableFirebase()
@NodeBootApplication()
export class MyApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

> 📖 **Full documentation:** [`@nodeboot/starter-firebase` README](./starters/firebase/README.md)

<p align="right">(<a href="#usage-guide-top">back to top</a>)</p>

---

## 🤖 OpenAI (`@nodeboot/starter-openai`)

<a name="enableopenai"></a>

### `@EnableOpenAI()`

**Purpose:** Registers `OpenAIConfiguration`, wiring up an OpenAI client bean from application configuration so services can inject and call OpenAI's API without manually managing API keys/client setup in application code.

**Example:**

```ts
@EnableDI(Container)
@EnableOpenAI()
@NodeBootApplication()
export class SampleApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

> 📖 **Full documentation:** [`@nodeboot/starter-openai` README](./starters/openai/README.md)

<p align="right">(<a href="#usage-guide-top">back to top</a>)</p>

---

## Further Reading

-   [Root README](./README.md) — architecture overview, packages, and quick start.
-   [`packages/core`](./packages/core) — source code for the core framework decorators.
-   [`packages/context`](./packages/context), [`packages/di`](./packages/di), [`packages/config`](./packages/config), [`packages/authorization`](./packages/authorization), [`packages/aot`](./packages/aot) — source code for the supporting-package decorators.
-   [Starters](./starters) — source code and package-level READMEs for every opt-in feature covered here (persistence, OpenAPI, scheduling, HTTP clients, validation, actuator, AWS, Backstage, Supabase, Firebase, OpenAI).

### Sample Projects

All samples live in the [`samples/`](./samples) directory and demonstrate different deployment models, server adapters, and feature combinations. Use them as starting points for your own applications.

| Sample Project                                                               | Deployment Type  | Description                                             | Key Features                                                                                  |
| ---------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [**sample-express**](./samples/sample-express)                               | HTTP Server      | Flagship Express reference app with full-stack features | Express, SQLite/TypeORM, OpenAPI, validation, authorization, scheduling, actuator, migrations |
| [**sample-express-mongodb**](./samples/sample-express-mongodb)               | HTTP Server      | Express with MongoDB & Firebase integration             | Express, MongoDB, Firebase, paging/cursor pagination, schemaless persistence                  |
| [**sample-fastify**](./samples/sample-fastify)                               | HTTP Server      | High-performance Fastify server                         | Fastify adapter, OpenAPI, fast routing                                                        |
| [**sample-koa**](./samples/sample-koa)                                       | HTTP Server      | Lightweight Koa server                                  | Koa adapter, middleware composition                                                           |
| [**sample-native-http**](./samples/sample-native-http)                       | HTTP Server      | Pure Node.js HTTP server (no framework)                 | Native `http` module, minimal dependencies                                                    |
| [**sample-native-http-supabase**](./samples/sample-native-http-supabase)     | HTTP Server      | Native HTTP with Supabase persistence                   | Native `http`, Supabase database, authentication                                              |
| [**sample-lambda**](./samples/sample-lambda)                                 | Serverless       | AWS Lambda function handler                             | Lambda adapter, API Gateway integration, stateless                                            |
| [**sample-cloudflare**](./samples/sample-cloudflare)                         | Serverless       | Cloudflare Workers edge deployment                      | Workers runtime, edge computing, global distribution                                          |
| [**sample-google-cloud-functions**](./samples/sample-google-cloud-functions) | Serverless       | Google Cloud Functions                                  | GCP Functions runtime, HTTP triggers                                                          |
| [**sample-netlify**](./samples/sample-netlify)                               | Serverless       | Netlify Functions deployment                            | Netlify runtime, JAMstack integration                                                         |
| [**sample-vercel**](./samples/sample-vercel)                                 | Serverless       | Vercel Serverless Functions                             | Vercel runtime, Next.js compatible                                                            |
| [**sample-encore**](./samples/sample-encore)                                 | Serverless       | Encore.ts service                                       | Encore platform, type-safe APIs, built-in infrastructure                                      |
| [**sample-ghost-server**](./samples/sample-ghost-server)                     | Desktop / Daemon | Background service with no HTTP layer                   | Persistence, scheduling, HTTP clients (as consumer), ideal for workers/daemons                |

**Choose based on your deployment target:**

-   **Traditional HTTP Servers** — Use `sample-express` (production-ready template), `sample-fastify` (performance), or `sample-koa` (simplicity).
-   **Serverless / Functions-as-a-Service** — Use `sample-lambda` (AWS), `sample-cloudflare` (edge), `sample-google-cloud-functions` (GCP), `sample-netlify`/`sample-vercel` (frontend platforms), or `sample-encore` (Encore.ts).
-   **Background Workers / Daemons** — Use `sample-ghost-server` (no HTTP layer, runs scheduled jobs or processes queues).
-   **Supabase** — Use `sample-native-http-supabase` for Supabase-backed apps.
-   **MongoDB** — Use `sample-express-mongodb` for document-oriented persistence with pagination examples.

### Delivering Code & Releasing

If you're contributing to the Node-Boot monorepo or managing versioned releases for your own Node-Boot-based projects, see the [**RELEASING.md**](./RELEASING.md) guide for details on:

-   **Changesets workflow** — how to create changesets for version bumps and changelogs
-   **Publishing packages** — `pnpm` workspace management, `workspace:*` dependencies, and automated releases
-   **Versioning strategy** — semantic versioning across the monorepo
-   **CI/CD integration** — automating releases with Changesets GitHub Action

<p align="right">(<a href="#usage-guide-top">back to top</a>)</p>
