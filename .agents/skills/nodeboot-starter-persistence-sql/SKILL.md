---
name: nodeboot-starter-persistence-sql
description: Use when the user wants relational/SQL persistence in a Node-Boot app via `@nodeboot/starter-persistence` and TypeORM — PostgreSQL, MySQL, MariaDB, SQLite/better-sqlite3, MSSQL, Oracle, CockroachDB, or Aurora. Covers TypeORM migrations, standard `Repository<T>`/`PagingAndSortingRepository<T>`, and SQL entity shape. This is the SQL flavour of `nodeboot-starter-persistence`; use `nodeboot-starter-persistence-mongodb` instead for `persistence.type mongodb`.
---

# `@nodeboot/starter-persistence` — SQL/relational flavour

Load [`../nodeboot-starter-persistence/SKILL.md`](../nodeboot-starter-persistence/SKILL.md) first
for the shared basics (`@EnableRepositories()`, `@DataRepository`, transactions). This skill covers
what's specific to a **relational** `persistence.type` (any TypeORM SQL dialect).

## Fresh start or existing app?

Read [`../_shared/fresh-vs-existing.md`](../_shared/fresh-vs-existing.md) first, then apply it
here:

-   **Fresh start:** `npx degit nodejs-boot/node-boot/samples/sample-express my-app` — this is the
    canonical SQL reference sample (uses `better-sqlite3`, but the entity/repository/migration code
    is dialect-agnostic; only `persistence.<dialect>` config changes for Postgres/MySQL/etc).
-   **Existing app:** check `persistence.type` in `app-config.yaml` — if it's any value other than
    `mongodb` (e.g. `postgres`, `mysql`, `better-sqlite3`, `sqlite`, `mssql`, ...) and/or the app has
    a `src/persistence/migrations/` folder, it's already on the SQL flavour.

## Entity shape

```typescript
import {Column, Entity, PrimaryGeneratedColumn} from "typeorm";

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    email: string;
}
```

## Repository + paging

```typescript
import {Repository} from "typeorm";
import {DataRepository, PagingAndSortingRepository} from "@nodeboot/starter-persistence";
import {User} from "../entities";

@DataRepository(User)
export class UserRepository extends Repository<User> {}

@DataRepository(User)
export class PagingUserRepository extends PagingAndSortingRepository<User> {}
```

`PagingAndSortingRepository<T>` adds `findPaginated(filter, options)` (page/pageSize/sortField/sortOrder)
and `findCursorPaginated(filter, options)` on top of the standard repository.

## Migrations

SQL is the only flavour with migrations. Register with `@Migration()` and set
`persistence.migrationsRun: true` (mutually exclusive with `synchronize: true`):

```typescript
import {Migration} from "@nodeboot/starter-persistence";
import {MigrationInterface, QueryRunner, Table} from "typeorm";

@Migration()
export class Migration1701774002463 implements MigrationInterface {
    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(new Table({name: "nb-user", columns: [] /* ... */}));
    }
    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("nb-user");
    }
}
```

## Key config

```yaml
persistence:
    type: "better-sqlite3" # or postgres / mysql / mariadb / mssql / oracle / sqlite / cockroachdb / aurora-*
    synchronize: false # keep false once migrations are in use
    migrationsRun: true
    better-sqlite3:
        database: "express-sample.db"
```

Full docs: [`starters/persistence/README.md`](https://github.com/nodejs-boot/node-boot/blob/main/starters/persistence/README.md)
(§ "Configure the datasource", "Defining Entities" → SQL, "Migrations", "Paging and Sorting" → SQL).
Reference sample: [`samples/sample-express`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-express).

## Validate

`cd samples/sample-express && pnpm dev`

Writing integration tests against SQL persistence? See
[`nodeboot-test-sql`](../nodeboot-test-sql/SKILL.md).
