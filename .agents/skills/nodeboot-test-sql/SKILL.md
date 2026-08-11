---
name: nodeboot-test-sql
description: Use when writing integration tests for a Node-Boot app that uses SQL persistence (`@nodeboot/starter-persistence` with a TypeORM SQL driver — Postgres, MySQL, sqlite, ...) — choosing between an in-memory/file sqlite fast path and a real database via `useGenericContainer`/testcontainers inside `@nodeboot/node-test`, plus running TypeORM migrations in tests. Load `nodeboot-test-framework` first for the base `useNodeBoot()` pattern.
---

# Testing Node-Boot apps backed by a SQL database

There's no dedicated `useSqlServer`-style hook (unlike MongoDB) — pick between two approaches, in
increasing order of realism/cost. For the app-side SQL starter setup being tested here, see
[`nodeboot-starter-persistence-sql`](../nodeboot-starter-persistence-sql/SKILL.md).

## Fast path — sqlite in-memory/file

Cheapest, no Docker required. Override `persistence`/`database` config to point at sqlite instead
of the app's real driver:

```ts
const {useRepository} = useNodeBoot(MyApp, ({useConfig}) => {
    useConfig({
        persistence: {type: "sqlite", database: ":memory:"}, // or a temp file path for cross-connection persistence
    });
});
```

Use this for the majority of repository/service tests where you're validating query logic, not
driver-specific SQL behavior. Note: TypeORM migrations targeting Postgres/MySQL-specific SQL
(`SERIAL`, `ENUM`, etc.) may not run against sqlite — either keep migrations portable or use the
real-database path below for migration tests.

## Real-parity path — `useGenericContainer` with Postgres/MySQL

When you need the actual driver (migration compatibility, DB-specific functions, constraint
behavior), spin up the real database as a Docker container with
[`nodeboot-test-containers`](../nodeboot-test-containers/SKILL.md)'s `useGenericContainer`, then
point the app's `persistence` config at it:

```ts
const {useRepository} = useNodeBoot(MyApp, ({useConfig, useGenericContainer}) => {
    useGenericContainer({
        containers: {
            postgres: {
                image: "postgres:16",
                environment: {POSTGRES_PASSWORD: "test", POSTGRES_DB: "test"},
                exposedPorts: [5432],
            },
        },
    });
});

it("runs migrations against the real driver", () => {
    const {host, getMappedPort} = useGenericContainer("postgres");
    // wire host/port into useConfig's persistence.* before the app starts, or via useEnv if the
    // app-config.yaml already reads from env vars (see nodeboot-starter-persistence-sql)
});
```

Because the container only becomes reachable once testcontainers starts it, wire its mapped
host/port into `useConfig`'s `persistence.<dialect>` overrides (or `useEnv` if the app's
`app-config.yaml` already reads the datasource host/port from env vars) inside the same setup
callback, right after calling `useGenericContainer(...)`.

## Validate

Run `pnpm test`. The fast sqlite path needs nothing extra; the container path needs a working
Docker daemon locally/in CI, same as [`nodeboot-test-containers`](../nodeboot-test-containers/SKILL.md).
