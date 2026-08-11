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

`cd samples/sample-express && pnpm dev`
