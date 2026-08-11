---
name: nodeboot-test-framework
description: Use when writing integration tests for a Node-Boot application — bootstrapping the app under test with `useNodeBoot()`, mocking services with `useMock`/`useSpy`, overriding config/env with `useConfig`/`useEnv`, calling its HTTP API with `useHttp`/`usePactum`/`useSupertest`, or reaching into the IoC container with `useService`/`useRepository`. This is the entry point for `@nodeboot/node-test`, the official Node-Boot integration test framework; for database containers, generic Docker containers, network-fault injection, or performance budgets in tests, see the linked specialized skills instead of inlining that detail here.
---

# Node-Boot Test Framework (`@nodeboot/node-test`)

A plugin-based integration test framework built specifically for Node-Boot apps: it boots a real
`NodeBootApp` (real DI container, real config, real routes) inside the test process and gives you
hooks to configure it before start and interact with it during tests. Reference repo:
[`nodejs-boot/node-boot-test-framework`](https://github.com/nodejs-boot/node-boot-test-framework),
runnable demos in
[`demos/node-test-demo/test`](https://github.com/nodejs-boot/node-boot-test-framework/tree/main/demos/node-test-demo/test).

```sh
pnpm add -D @nodeboot/node-test
```

## The core pattern

```ts
import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {useNodeBoot} from "@nodeboot/node-test";
import {MyApp} from "./MyApp";

describe("My App Integration Tests", () => {
    const {useHttp, useService, useConfig} = useNodeBoot(MyApp, ({useConfig, useMock, useEnv, usePactum}) => {
        useConfig({app: {port: 3001}, database: {url: "sqlite::memory:"}}); // Setup hook
        useEnv({NODE_ENV: "test"});
        usePactum(); // enable Pactum-based HTTP assertions
        useMock(EmailService, {sendEmail: () => Promise.resolve()});
    });

    test("should handle API requests", async () => {
        const {get} = useHttp(); // Return hook
        const response = await get("/api/users");
        assert.equal(response.status, 200);
    });

    test("should access services", () => {
        const userService = useService(UserService);
        assert.ok(userService, "UserService should be defined");
    });
});
```

## Setup hooks vs. return hooks — don't mix them up

`useNodeBoot(App, setupCallback)` takes a **setup** callback (runs _before_ the app starts) and
**returns** an object of **runtime** hooks (used _during_ tests, after the app is running):

-   **Setup hooks** — called only inside the `setupCallback` argument: `useConfig(overrides)`,
    `useEnv(vars)`, `useMock(Class, impl)`, `usePactum(baseUrl?)`, `useCleanup({afterAll, afterEach})`,
    `useAddress(cb)`, `useAppContext(cb)`. They configure the app; they cannot access a running
    service or make HTTP calls yet.
-   **Return/runtime hooks** — destructured from `useNodeBoot(...)`'s return value, called inside
    `test`/`it` blocks: `useService(Class)`, `useRepository(Class)`, `useHttp(baseUrl?)`,
    `useSupertest()`, `useSpy(Class, "method")`, `useConfig()` (read-only here), `useAppContext()`.
-   A few hooks (`useAppContext`, `useConfig`) work in **both** phases with different signatures —
    check whether you're inside the setup callback or a test body.

Lifecycle order: `beforeStart` → app starts → `afterStart` → `beforeTests` → (`beforeEachTest` →
test → `afterEachTest`)\* → `afterTests`.

## Everyday hooks

| Hook                                         | Phase          | Purpose                                                                                       |
| -------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------- |
| `useConfig(overrides)` / `useConfig()`       | Setup / Return | Override `app-config.yaml` values for the test run / read the effective config.               |
| `useEnv(vars)`                               | Setup          | Set process env vars for the test session.                                                    |
| `useMock(Class, impl)`                       | Setup          | Replace a `@Service`/`@Component`'s methods; auto-restored after the suite.                   |
| `useSpy(Class, "method")`                    | Return         | Wrap a real method to assert call count/args without replacing its behavior.                  |
| `usePactum(baseUrl?)`                        | Setup          | Enable [Pactum](https://pactumjs.github.io/) `spec()` HTTP assertions.                        |
| `useHttp(baseUrl?)`                          | Return         | Minimal `{get,post,put,delete}` HTTP client against the running app.                          |
| `useSupertest()`                             | Return         | Supertest instance with chained `.expect(...)` assertions.                                    |
| `useService(Class)` / `useRepository(Class)` | Return         | Pull a `@Service`/repository straight out of the IoC container.                               |
| `useAddress(cb)`                             | Setup          | Get the server's listening address once it's up (e.g. to wire an external mock).              |
| `useAppContext(cb)` / `useAppContext()`      | Setup / Return | Access the full `ApplicationContext` (config, logger, ...).                                   |
| `useCleanup({afterAll, afterEach})`          | Setup          | Register cleanup callbacks without a separate test-runner hook.                               |
| `useApplicationEvent(...)`                   | Setup          | Assert on Node-Boot lifecycle events fired during `beforeStart`/`afterStart`.                 |
| `useTimer({toFake: [...]})`                  | Setup / Return | Fake timers (`setTimeout`, `Date`, ...) scoped to the test, with manual `control`/`tracking`. |

## Need something heavier?

These need extra infrastructure (Docker, in-memory servers) or are narrow enough to deserve their
own skill so you don't load them unless needed:

| Need                                                                           | Skill                                                                              |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Testing a MongoDB-backed app (in-memory, replica set, or real container)       | [`nodeboot-test-mongodb`](../nodeboot-test-mongodb/SKILL.md)                       |
| Testing a SQL-backed app (sqlite fast path or a real Postgres/MySQL container) | [`nodeboot-test-sql`](../nodeboot-test-sql/SKILL.md)                               |
| Spinning up any other Docker container (Redis, custom services) for a test     | [`nodeboot-test-containers`](../nodeboot-test-containers/SKILL.md)                 |
| Simulating network latency/failures between the app and a dependency           | [`nodeboot-test-network-resilience`](../nodeboot-test-network-resilience/SKILL.md) |
| Asserting operations stay within a time budget                                 | [`nodeboot-test-performance`](../nodeboot-test-performance/SKILL.md)               |

## Validate

Run the app's own test script (`pnpm test`, usually Jest or `node --test`) after writing/changing
an integration test. For a hands-on reference, clone and run the
[demo project](https://github.com/nodejs-boot/node-boot-test-framework/tree/main/demos/node-test-demo).
