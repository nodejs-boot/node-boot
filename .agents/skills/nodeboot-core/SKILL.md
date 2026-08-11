---
name: nodeboot-core
description: Use when writing or reviewing any Node-Boot application code — the @NodeBootApplication entry point, @Controller/@Get/@Post routing, request parameter injection (@Param/@Body/@QueryParam/...), dependency injection with @Component/@Service, @Configuration/@Bean factories, @Middleware/@ErrorHandler/@Interceptor, or application lifecycle hooks. This is the foundational skill for the @nodeboot/core package that every Node-Boot app is built from; load it first before any starter- or server-specific skill.
---

# Node-Boot Core

> Brand-new project and no repo exists yet? Decide simple-repo vs. monorepo first — see
> [`nodeboot-project-type`](../nodeboot-project-type/SKILL.md) — then come back here.

Node-Boot apps are composed almost entirely from decorators in `@nodeboot/core`. The full,
decorator-by-decorator reference (with purpose + example for every decorator) lives in
[`USAGE_GUIDE.md`](https://github.com/nodejs-boot/node-boot/blob/main/USAGE_GUIDE.md#-core-framework-nodebootcore) and
[`resources/decorators-reference.md`](resources/decorators-reference.md) — read those for anything
not covered by the minimal skeleton below.

## Minimal app skeleton

```ts
@EnableDI(Container) // from @nodeboot/di — required for constructor injection
@EnableComponentScan() // auto-discovers @Controller/@Service/@Component/@Configuration classes
@NodeBootApplication()
export class MyApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer); // swap for FastifyServer/KoaServer/HttpServer/... — see nodeboot-servers-http
    }
}

@Controller("/users", "v1")
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get("/:id")
    getUser(@Param("id") id: string, @QueryParam("expand") expand?: string) {
        return this.userService.findById(id);
    }

    @Post("/")
    @HttpCode(201)
    createUser(@Body() dto: CreateUserDto) {
        return this.userService.create(dto);
    }
}

@Service()
export class UserService {
    constructor(@Inject("S3Client") private readonly s3: S3Client) {}
}
```

## Decision points an agent should get right

-   **`@Component` vs `@Service`** — functionally identical (both register with DI); use `@Service`
    for business logic, `@Component` for lower-level infra/clients. Pure convention.
-   **Component scan vs explicit lists** — `@EnableComponentScan()` auto-discovers everything;
    use `@Controllers([...])` / `@GlobalMiddlewares([...])` / `@Interceptors([...])` /
    `@Configurations([...])` instead when you need explicit, visible wiring (common in tests and
    serverless bundles where scanning is undesirable).
-   **`@Configuration` + `@Bean`** — the only way to construct objects that aren't simple
    `@Component`/`@Service` classes (config-derived values, third-party SDK clients, async init).
    Supports conditional loading via `onConfig` (config path must exist) and `@Profile([...])`
    (active profile must match) — this is the exact pattern every "SDK auto-configuration" starter
    uses (see `nodeboot-extending-nodeboot` Flavour 1/5/6).
-   **Request data** — never reach into raw `req`/`ctx` manually; use the parameter decorator table
    in `resources/decorators-reference.md`. `@Req()`/`@Res()` are documented escape hatches for when
    no decorator fits, but prefer the typed decorators — they're framework-agnostic (same code runs
    on Express/Fastify/Koa/native HTTP).
-   **Lifecycle hooks** — cross-cutting features (schedulers, HTTP clients, custom providers) hook
    into `@Lifecycle("application.initialized" | "persistence.started" | "application.started" |
"application.stopped")` via an `ApplicationFeatureAdapter`. See `nodeboot-extending-nodeboot` for
    when to build one yourself.

## Validate

Run `pnpm tsc && pnpm test` from repo root (type-checks and tests ripple across packages), or run
a specific sample end-to-end, e.g. `cd samples/sample-express && pnpm dev`. For writing new
integration tests against a Node-Boot app, see
[`nodeboot-test-framework`](../nodeboot-test-framework/SKILL.md).
