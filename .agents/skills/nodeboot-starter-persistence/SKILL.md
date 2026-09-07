---
name: nodeboot-starter-persistence
description: Use when the user wants TypeORM-backed persistence in a Node-Boot app with `@nodeboot/starter-persistence`; this starter is enabled with `@EnableRepositories()` and is the right skill for datasource configuration, `@DataRepository(...)`, `@Transactional()`, migrations, entity subscribers, and built-in pagination repositories.
---

# `@nodeboot/starter-persistence`

Use this starter when the app needs a real persistence layer. `@EnableRepositories()` turns on datasource wiring, repository registration, transaction support, and persistence lifecycle events that other starters can depend on.

## SQL or MongoDB?

This skill covers what's common to both. Once you know the database flavour, load the matching
skill for scaffold guidance, entity shape, repositories, and paging specifics:

-   **Relational (Postgres, MySQL, MariaDB, SQLite/better-sqlite3, MSSQL, Oracle, CockroachDB, Aurora):**
    [`../nodeboot-starter-persistence-sql/SKILL.md`](../nodeboot-starter-persistence-sql/SKILL.md)
-   **MongoDB:**
    [`../nodeboot-starter-persistence-mongodb/SKILL.md`](../nodeboot-starter-persistence-mongodb/SKILL.md)

If it's unclear yet, ask, or check an existing app's `persistence.type` in `app-config.yaml`.

## Enable

```ts
@EnableDI(Container)
@EnableRepositories()
@EnableComponentScan()
@NodeBootApplication()
export class SampleApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

## Minimal repository

```ts
@DataRepository(User)
export class UserRepository extends Repository<User> {}
```

## Key config

```yaml
persistence:
    type: "better-sqlite3"
    synchronize: false
    cache: true
    migrationsRun: true
    better-sqlite3:
        database: "express-sample.db"
```

For MongoDB, switch `persistence.type` to `mongodb` and configure `persistence.mongodb.url` plus `persistence.mongodb.database` — see `nodeboot-starter-persistence-mongodb` for the full flavour.

Full docs: [`starters/persistence/README.md`](https://github.com/nodejs-boot/node-boot/blob/main/starters/persistence/README.md)

## Validate

`cd samples/sample-express && pnpm dev` for a manual check.

For automated proof that every persistence decorator actually autowires into a _running_ app (as
opposed to just registering metadata), see, all under `starters/persistence/tests/`:

-   `persistence-decorators.test.ts` — annotation-level: each decorator (`@DataRepository`,
    `@EntityEventSubscriber`, `@Migration`, `@PersistenceCache`, `@PersistenceNamingStrategy`,
    `@Transactional`) called directly against throwaway classes, asserting on the resulting
    `PersistenceContext`/`Reflect` metadata — no live database, mirrors the decorator-metadata style
    used in `packages/core/test`/`packages/di/test`.
-   `persistence-auto-configuration.it.test.ts` / `persistence-decorators.it.test.ts` — `useNodeBoot()`-
    booted apps (on `@nodeboot/ghost-server`) proving `@DataRepository`, `@EntityEventSubscriber`,
    `@PersistenceNamingStrategy`, `@PersistenceCache`, and `@Transactional` (commit _and_ rollback)
    all take effect together against a real in-memory `better-sqlite3` datasource (see
    `nodeboot-test-sql`'s fast path). In standard apps use `useRepository()`; inside monorepo starter
    tests beans are resolved via `Container.get()` from `typedi` due to workspace package dependencies.
-   `persistence-migration.it.test.ts` — `@Migration` specifically, kept separate because
    `synchronize`/`migrationsRun` are mutually exclusive: boots with `synchronize: false`, so the
    only way its table exists is because the migration ran.

Every other test in this package constructs a TypeORM `DataSource` directly, bypassing Node-Boot's
bootstrap entirely — these are the ones that prove the starter's own auto-configuration chain. See
`nodeboot-extending-nodeboot`'s "Testing a starter package" section before writing this style of
test for a different starter.
