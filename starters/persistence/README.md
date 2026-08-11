# 🗄️ `@nodeboot/starter-persistence` – Node-Boot Persistence Starter

## Overview

`@nodeboot/starter-persistence` is the **Node-Boot** starter for building a persistence layer on top of **[TypeORM](https://typeorm.io/)**, the ORM that powers this package under the hood. Every entity, repository, transaction, migration, and connection option documented below maps directly onto TypeORM's own APIs — the starter's job is to auto-configure and dependency-inject them the "Node-Boot way" instead of you wiring TypeORM's `DataSource` by hand.

It auto-configures your TypeORM datasource, registers custom repositories in the DI container, wires transaction support, runs migrations, validates SQL schema consistency, installs persistence listeners, exposes paging helpers, and integrates TypeORM logging with Winston.

It supports both **SQL databases** (via TypeORM's SQL drivers) and **MongoDB** (via TypeORM's MongoDB driver).

---

## ✨ Features

-   ✅ **One-line activation** with `@EnableRepositories()`
-   ✅ **Auto-configured TypeORM datasource** from `app-config.yaml`
-   ✅ **Custom repositories** with `@DataRepository(...)`
-   ✅ **Dependency-injected repositories** via Node-Boot DI
-   ✅ **Transactional methods** with `@Transactional()`
-   ✅ **Programmatic transactions** with `runInTransaction(...)`
-   ✅ **Transaction lifecycle hooks** for commit / rollback / complete
-   ✅ **Migration registration** with `@Migration()`
-   ✅ **Entity subscribers** with `@EntityEventSubscriber()`
-   ✅ **Built-in pagination repositories** for SQL and MongoDB
-   ✅ **MongoDB helper hooks** for `MongoClient`, collections, managers, and query runners
-   ✅ **Custom naming strategy** with `@PersistenceNamingStrategy()`
-   ✅ **Custom datasource overrides** with `@DatasourceConfiguration(...)`
-   ✅ **Query cache integration** with `cache` config and `@PersistenceCache()`
-   ✅ **Winston-backed TypeORM logging**

---

## 🚀 Installation

Install the starter plus its required peers:

```sh
pnpm add @nodeboot/starter-persistence typeorm winston
```

Then install the driver for your database:

```sh
# PostgreSQL
pnpm add pg

# MongoDB
pnpm add mongodb

# SQLite (sample used in this repo)
pnpm add better-sqlite3
```

> `reflect-metadata` must be loaded by your application before Node-Boot starts.

---

## 🔥 Basic Usage

### 1️⃣ Enable persistence

Use `@EnableRepositories()` on your application class.

```typescript
import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {ExpressServer} from "@nodeboot/express-server";
import {EnableDI} from "@nodeboot/di";
import {EnableComponentScan} from "@nodeboot/aot";
import {EnableRepositories} from "@nodeboot/starter-persistence";

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

> Repositories are bound through the DI container, so enabling DI is required for custom repository injection.

---

### 2️⃣ Configure the datasource

The starter reads its settings from the `persistence` config node.

#### Example: SQL (`better-sqlite3`)

```yaml
persistence:
    type: "better-sqlite3"
    synchronize: false
    cache: true
    migrationsRun: true
    better-sqlite3:
        database: "express-sample.db"
    transactions:
        maxHookHandlers: 10
```

#### Example: MongoDB

```yaml
persistence:
    type: "mongodb"
    cache: false
    mongodb:
        database: "facts"
        url: "${MONGODB_URL}"
```

### Supported `persistence.type` values

-   `aurora-mysql`
-   `aurora-postgres`
-   `better-sqlite3`
-   `cockroachdb`
-   `mongodb`
-   `mysql`
-   `mariadb`
-   `oracle`
-   `postgres`
-   `sap`
-   `spanner`
-   `sqlite`
-   `mssql`

---

## 🧱 Defining Entities

Entities are plain TypeORM entities — `@nodeboot/starter-persistence` does not introduce its own entity/decorator layer. Import `@Entity`, `@Column`, `@PrimaryGeneratedColumn`, `@ObjectIdColumn`, and every other TypeORM decorator directly from `typeorm`, exactly as you would in a standalone TypeORM project. This means any existing TypeORM knowledge, entity, or relation mapping transfers to Node-Boot without changes.

### SQL entity

```typescript
import {Column, Entity, PrimaryGeneratedColumn} from "typeorm";

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    email: string;

    @Column()
    password: string;

    @Column({nullable: true})
    name?: string;
}
```

### MongoDB entity

```typescript
import {Column, Entity, ObjectIdColumn} from "typeorm";

@Entity("users")
export class User {
    @ObjectIdColumn()
    _id?: string;

    @Column()
    email: string;

    @Column()
    password: string;

    @Column({nullable: true})
    name?: string;
}
```

---

## 🧩 Defining Repositories

TypeORM's repository pattern gives you a type-safe API (`find`, `save`, `delete`, `createQueryBuilder`, ...) scoped to a single entity, instead of working with a raw `EntityManager`/`Connection`. Normally you'd have to call `dataSource.getRepository(Entity)` yourself and manage the resulting instance. `@DataRepository(Entity)` removes that step: decorate a class that extends one of TypeORM's repository base classes, and the starter creates it against the auto-configured datasource **and** registers it as an injectable DI bean in the same step — so you can add custom query methods on top of the standard repository API and simply inject the repository class wherever it's needed.

Supported TypeORM repository bases:

-   `Repository<T>`
-   `MongoRepository<T>`
-   `TreeRepository<T>`

### Standard SQL repository

```typescript
import {Repository} from "typeorm";
import {DataRepository} from "@nodeboot/starter-persistence";
import {User} from "../entities";

@DataRepository(User)
export class UserRepository extends Repository<User> {
    findByQueryIn() {
        return this.createQueryBuilder("user")
            .where("user.id IN (:...ids)", {ids: [1, 2]})
            .getMany();
    }
}
```

### Standard MongoDB repository

```typescript
import {MongoRepository} from "typeorm";
import {DataRepository, useMongoClient, useMongoCollection} from "@nodeboot/starter-persistence";
import {User} from "../entities";

@DataRepository(User)
export class UserRepository extends MongoRepository<User> {
    async findAllUsingCollection() {
        return useMongoCollection<User>(this, "users").find({}).toArray();
    }

    async findAllUsingClient() {
        return useMongoClient(this).db("facts").collection<User>("users").find({}).toArray();
    }
}
```

---

## 💉 Injecting Repositories and Persistence Beans

Beyond your own `@DataRepository(...)` classes, you often need direct access to TypeORM's lower-level building blocks — the `DataSource` itself, a shared `EntityManager`, or (for MongoDB) the underlying driver's `MongoClient`. Rather than importing/creating these yourself, the starter registers them as DI beans once persistence is enabled, so they can be injected exactly like any other Node-Boot bean.

Once persistence is enabled, the starter registers:

-   `DataSource`
-   `EntityManager`
-   custom repositories decorated with `@DataRepository(...)`
-   `MongoClient` when `persistence.type` is `mongodb`

### Injecting a custom repository

```typescript
import {Service} from "@nodeboot/core";
import {UserRepository} from "../persistence";

@Service()
export class UserService {
    constructor(private readonly userRepository: UserRepository) {}

    async findAllUser() {
        return this.userRepository.find();
    }
}
```

### Injecting `MongoClient`

```typescript
import {MongoClient} from "mongodb";
import {Service} from "@nodeboot/core";

@Service()
export class UserService {
    constructor(private readonly mongoClient: MongoClient) {}

    async findAllUserV2() {
        return this.mongoClient.db("facts").collection("users").find({}).toArray();
    }
}
```

---

## 🔄 Transactions

Database operations frequently need to succeed or fail together — e.g. debiting one account and crediting another must not leave the data half-updated if something goes wrong. TypeORM already exposes transaction primitives (`DataSource.transaction(...)`, `QueryRunner`, manual `startTransaction()`/`commitTransaction()`/`rollbackTransaction()`), but using them directly means threading a `QueryRunner`/`EntityManager` through every call in a business operation.

`@nodeboot/starter-persistence` removes that boilerplate with a **declarative, decorator-based transaction API** built on top of TypeORM's transaction support:

-   Wrap an entire service method in a transaction with a single `@Transactional()` decorator — no manual `QueryRunner` plumbing.
-   The active transaction is propagated automatically via async-local-context, so any repository call made (directly or transitively) inside the decorated method participates in the same transaction.
-   Register callbacks that only run on commit, only on rollback, or always on completion — useful for side effects (emitting events, invalidating caches) that must only happen once the transaction outcome is known.
-   Prefer a functional style instead of decorators? `runInTransaction(...)` gives you the same guarantees imperatively.
-   Works uniformly across SQL databases and MongoDB (MongoDB requires a deployment that supports sessions/transactions, e.g. a replica set).

### `@Transactional()` on service methods

Annotate a method with `@Transactional()` to run its entire body — including everything called from it — inside a single TypeORM transaction. If the method throws, the transaction is rolled back automatically; if it resolves, the transaction is committed.

```typescript
import {Logger} from "winston";
import {Service} from "@nodeboot/core";
import {Transactional, runOnTransactionCommit, runOnTransactionRollback} from "@nodeboot/starter-persistence";

@Service()
export class UserService {
    constructor(private readonly logger: Logger, private readonly userRepository: UserRepository) {}

    @Transactional()
    async createUser(userData: CreateUserDto): Promise<User> {
        const existingUser = await this.userRepository.findOneBy({
            email: userData.email,
        });

        runOnTransactionCommit(() => {
            this.logger.info("Transaction was successfully committed");
        });

        if (existingUser) {
            throw new Error(`This email ${userData.email} already exists`);
        }

        return this.userRepository.save(userData);
    }

    @Transactional()
    async deleteUser(userId: number): Promise<void> {
        runOnTransactionRollback(error => {
            this.logger.warn("Transaction was rolled back due to error:", error);
        });

        await this.userRepository.delete({id: userId});
        throw new Error("Force rollback");
    }
}
```

### Programmatic transactions with `runInTransaction(...)`

When a decorator doesn't fit — for example, you only need a transaction around part of a method, or you're composing transactional logic dynamically — wrap the code in `runInTransaction(...)` instead. It offers the exact same commit/rollback/complete semantics as `@Transactional()`.

```typescript
import {runInTransaction, runOnTransactionComplete} from "@nodeboot/starter-persistence";

await runInTransaction(async () => {
    await this.userRepository.save(user);

    runOnTransactionComplete(error => {
        if (error) {
            this.logger.error("Transaction failed", error);
        }
    });
});
```

### Transaction hooks

Hooks let you react to the transaction's outcome without polluting your business logic with try/catch/finally blocks. They must be called from within a method running inside a transaction (`@Transactional()` or `runInTransaction(...)`).

The root package exports these helpers:

-   `runOnTransactionCommit(cb)` — runs `cb` only if the transaction commits successfully.
-   `runOnTransactionRollback(cb)` — runs `cb` only if the transaction is rolled back, receiving the triggering error.
-   `runOnTransactionComplete(cb)` — always runs `cb` once the transaction settles, receiving the error (if any).
-   `runInTransaction(fn)` — runs `fn` inside a new transaction programmatically.

### Notes

-   Transactions are initialized automatically by `@EnableRepositories()`.
-   SQL transactions use TypeORM datasource transaction handling plus async context propagation.
-   MongoDB uses a custom `MongoTransactionalQueryRunner` so repository operations participate in the active Mongo session.
-   MongoDB transactions require a deployment that supports sessions / transactions.
-   `@Transactional()` also accepts advanced transaction options internally (`connectionName`, `propagation`, `isolationLevel`, `name`).

---

## 📦 Migrations

Schema changes need to be versioned, repeatable, and applied in the same order across every environment — hand-run SQL scripts or `synchronize: true` in production don't give you that safety net. TypeORM already ships a full migration system (`MigrationInterface`, `up`/`down`, a migrations table, a CLI); `@Migration()` simply plugs your migration classes into that system automatically, instead of you having to register them manually with the datasource or the TypeORM CLI's config.

Register migrations with `@Migration()` and enable them with `persistence.migrationsRun: true`. Each migration implements the standard TypeORM `MigrationInterface`, using the injected `QueryRunner` for schema changes (`createTable`, `dropTable`, etc.) or raw SQL.

```typescript
import {Migration} from "@nodeboot/starter-persistence";
import {MigrationInterface, QueryRunner, Table} from "typeorm";

@Migration()
export class Migration1701774002463 implements MigrationInterface {
    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "nb-user",
                columns: [
                    {
                        name: "id",
                        type: "INTEGER",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment",
                    },
                    {name: "email", type: "varchar"},
                    {name: "password", type: "varchar"},
                ],
            }),
        );
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("nb-user");
    }
}
```

You can also use raw SQL in later migrations:

```typescript
import {Migration} from "@nodeboot/starter-persistence";
import {MigrationInterface, QueryRunner} from "typeorm";

@Migration()
export class Migration1701786331338 implements MigrationInterface {
    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "nb-user" ADD COLUMN "name" varchar(255)`);
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "nb-user" DROP COLUMN "name"`);
    }
}
```

> The starter prevents `synchronize` and `migrationsRun` from being enabled at the same time.

---

## 📄 Paging and Sorting

Listing endpoints almost always need pagination, but implementing offset-based and cursor-based paging correctly — with sorting, stable ordering, and count queries — on top of TypeORM's `find`/query-builder APIs is repetitive and easy to get subtly wrong (especially cursor pagination). The starter provides ready-to-extend repository base classes that add page-based and cursor-based paging on top of a standard TypeORM repository, for both SQL and MongoDB, so you only declare the repository and immediately get both paging styles.

### SQL paging repository

```typescript
import {DataRepository, PagingAndSortingRepository} from "@nodeboot/starter-persistence";
import {User} from "../entities";

@DataRepository(User)
export class PagingUserRepository extends PagingAndSortingRepository<User> {}
```

Usage:

```typescript
const page = await this.pagingUserRepository.findPaginated(
    {},
    {page: 1, pageSize: 10, sortField: "id", sortOrder: "DESC"},
);

const cursorPage = await this.pagingUserRepository.findCursorPaginated(
    {},
    {pageSize: 10, cursor: lastCreatedAt, sortField: "createdAt", sortOrder: "DESC"},
);
```

### MongoDB paging repository

```typescript
import {DataRepository, MongoPagingAndSortingRepository} from "@nodeboot/starter-persistence";
import {User} from "../entities";

@DataRepository(User)
export class PagingUserRepository extends MongoPagingAndSortingRepository<User> {}
```

Usage:

```typescript
const page = await this.pagingUserRepository.findPaginated(
    {},
    {page: 1, pageSize: 10, sortField: "_id", sortOrder: "DESC"},
);

const cursorPage = await this.pagingUserRepository.findCursorPaginated(
    {},
    {pageSize: 10, lastId, sortField: "_id", sortOrder: "ASC"},
);
```

### Repository methods provided

#### `PagingAndSortingRepository<T>`

-   `findPaginated(filter, options)`
-   `findCursorPaginated(filter, options)`

#### `MongoPagingAndSortingRepository<T>`

-   `findById(id)`
-   `findPaginated(filter, options)`
-   `findCursorPaginated(filter, options)`

---

## 🪝 Persistence Hooks and Low-Level Access

The repository pattern covers most use cases, but some operations — running raw queries in the same connection/transaction as your repository, or reaching into the native MongoDB driver for an aggregation pipeline — need the underlying TypeORM (or Mongo driver) primitive directly. Instead of re-resolving the `DataSource`/`MongoClient` yourself, these helper functions pull the corresponding TypeORM primitive straight off an existing `@DataRepository(...)` instance, so it stays consistent with the connection/transaction context that repository is already operating in.

### SQL helpers

```typescript
import {useEntityManager, useQueryRunner} from "@nodeboot/starter-persistence";

const entityManager = useEntityManager(this.userRepository);
const queryRunner = useQueryRunner(this.userRepository);
```

### MongoDB helpers

```typescript
import {
    useMongoClient,
    useMongoCollection,
    useMongoEntityManager,
    useMongoQueryRunner,
} from "@nodeboot/starter-persistence";

const client = useMongoClient(this.userRepository);
const collection = useMongoCollection<User>(this.userRepository, "users");
const manager = useMongoEntityManager(this.userRepository);
const queryRunner = useMongoQueryRunner(this.userRepository);
```

These helpers are useful when you need direct access to TypeORM or Mongo primitives while still working inside Node-Boot repositories.

---

## 🎧 Entity Subscribers

TypeORM's subscriber API (`EntitySubscriberInterface`) lets you react to entity lifecycle events — inserts, updates, removes, loads, and transaction boundaries — independently of your repositories and services, which is ideal for cross-cutting concerns like auditing, cache invalidation, or emitting domain events. Normally you'd have to register each subscriber instance with the `DataSource` manually. `@EntityEventSubscriber()` registers the class as a TypeORM subscriber automatically when persistence starts, and — since the class also becomes a Node-Boot bean — it can use `@Inject()` to pull in the logger or any other component it needs.

### Entity-specific subscriber

```typescript
import {EntityEventSubscriber} from "@nodeboot/starter-persistence";
import {EntitySubscriberInterface, InsertEvent} from "typeorm";
import {Inject} from "@nodeboot/di";
import {Logger} from "winston";

@EntityEventSubscriber()
export class UserEntityEventListener implements EntitySubscriberInterface<User> {
    @Inject()
    private logger: Logger;

    listenTo() {
        return User;
    }

    beforeInsert(event: InsertEvent<User>) {
        this.logger.info(`BEFORE USER INSERTED: `, event.entity);
    }

    afterInsert(event: InsertEvent<User>) {
        this.logger.info(`AFTER USER INSERTED: `, event.entity);
    }
}
```

### Global subscriber

If you omit `listenTo()`, the subscriber can observe events across entities.

The sample app in this repository includes a global subscriber that listens to:

-   `afterLoad`
-   `beforeInsert` / `afterInsert`
-   `beforeUpdate` / `afterUpdate`
-   `beforeRemove` / `afterRemove`
-   `beforeSoftRemove` / `afterSoftRemove`
-   `beforeRecover` / `afterRecover`
-   `beforeTransactionStart` / `afterTransactionStart`
-   `beforeTransactionCommit` / `afterTransactionCommit`
-   `beforeTransactionRollback` / `afterTransactionRollback`

> Subscriber instances also receive field injection from the DI container.

---

## 🪵 Logging

TypeORM can emit detailed logs for every query, slow query, schema change, and migration — invaluable for debugging and performance tuning, but only if it's routed through your application's actual logging pipeline instead of writing to `stdout` on its own. The starter installs a `PersistenceLogger` that implements TypeORM's logger contract and forwards every log line to your existing Winston logger, at an appropriate severity level, so persistence logs show up consistently alongside the rest of your application logs.

Useful config keys:

```yaml
persistence:
    type: "postgres"
    logging:
        - "query"
        - "error"
        - "warn"
    maxQueryExecutionTime: 1000
    logFormat:
        highlightSql: true
    postgres:
        host: "${DB_HOST}"
        port: 5432
        username: "${DB_USER}"
        password: "${DB_PASSWORD}"
        database: "${DB_NAME}"
```

Log routing is:

-   `log`, `schema-build`, `migration` → `logger.debug(...)`
-   `info`, `query` → `logger.info(...)`
-   `warn`, `query-slow` → `logger.warn(...)`
-   `error`, `query-error` → `logger.error(...)`

---

## ⚡ Query Cache

Repeatedly running the same expensive query (a heavy join, an aggregation, a report) puts unnecessary load on your database. TypeORM has a built-in query result cache that can store results in the database itself or in Redis, keyed by query + parameters, and TTL-based; the starter exposes this through plain configuration (no code changes needed to turn it on) plus a decorator for supplying a fully custom cache implementation when the built-in providers aren't enough.

You can enable TypeORM query caching with either a boolean or a config object.

### Simple cache enablement

```yaml
persistence:
    type: "better-sqlite3"
    cache: true
    better-sqlite3:
        database: "app.db"
```

### Advanced cache config

```yaml
persistence:
    type: "postgres"
    cache:
        type: "database"
        tableName: "query-result-cache"
        duration: 1000
        alwaysEnabled: false
        ignoreErrors: true
    postgres:
        host: "${DB_HOST}"
        port: 5432
        username: "${DB_USER}"
        password: "${DB_PASSWORD}"
        database: "${DB_NAME}"
```

Supported cache types:

-   `database`
-   `redis`
-   `ioredis`
-   `ioredis/cluster`

### Custom cache provider

When the built-in cache types don't fit (e.g. you want a different cache backend, or custom key/serialization logic), implement TypeORM's `QueryResultCache` interface yourself and register it with `@PersistenceCache()` — the starter wires it into the datasource in place of the built-in providers.

```typescript
import {PersistenceCache} from "@nodeboot/starter-persistence";
import {QueryResultCache} from "typeorm/cache/QueryResultCache";

@PersistenceCache()
export class CustomQueryCache implements QueryResultCache {
    // Implement the QueryResultCache contract here.
}
```

---

## 🏷️ Custom Naming Strategy

TypeORM derives table, column, index, and join-table names from your entity/property names using a `NamingStrategyInterface` implementation (`DefaultNamingStrategy` by default). If your organization has naming conventions — table prefixes, snake_case columns, custom join-table naming — you can supply your own strategy by extending TypeORM's `DefaultNamingStrategy` (or implementing the interface from scratch) and registering it with `@PersistenceNamingStrategy()`, which plugs it into the datasource in place of the default.

```typescript
import {DefaultNamingStrategy} from "typeorm";
import {PersistenceNamingStrategy} from "@nodeboot/starter-persistence";

@PersistenceNamingStrategy()
export class CustomNamingStrategy extends DefaultNamingStrategy {
    name = "sample-naming-strategy";

    override tableName(targetName: string, userSpecifiedName: string | undefined): string {
        return `nb-${super.tableName(targetName, userSpecifiedName)}`;
    }
}
```

---

## ⚙️ Datasource Overrides

Most datasource options are covered by `app-config.yaml`, but some setups need values computed at runtime — secrets fetched from a vault, options that depend on the deployment environment, or settings that are awkward to express in YAML. `@DatasourceConfiguration(...)` lets you supply a partial TypeORM `DataSourceOptions` object programmatically; the starter merges it with the values loaded from configuration before creating the datasource.

```typescript
import {DatasourceConfiguration} from "@nodeboot/starter-persistence";

@DatasourceConfiguration({
    type: "better-sqlite3",
    database: "express-sample.db",
    synchronize: false,
    migrationsRun: true,
})
export class DatasourceOverridesConfiguration {}
```

Notes:

-   Overrides are merged with the config file values.
-   The override `type` must match `persistence.type`.
-   The starter blocks invalid combinations such as `synchronize: true` and `migrationsRun: true` together.

---

## 🛠️ Configuration Reference

### Common top-level keys under `persistence`

| Key                            | Description                                                  |
| ------------------------------ | ------------------------------------------------------------ |
| `type`                         | Required database type.                                      |
| `synchronize`                  | Auto-sync schema / indices at startup. Best for development. |
| `migrationsRun`                | Run registered migrations automatically at startup.          |
| `dropSchema`                   | Drop schema on startup. Dangerous outside development.       |
| `cache`                        | `true` / `false` or query cache object.                      |
| `logging`                      | TypeORM logging options.                                     |
| `logFormat`                    | Formatting options passed to TypeORM log preparation.        |
| `maxQueryExecutionTime`        | Warn when queries exceed this duration.                      |
| `migrationsTableName`          | Custom migrations table name.                                |
| `migrationsTransactionMode`    | `all`, `none`, or `each`.                                    |
| `metadataTableName`            | Custom TypeORM metadata table name.                          |
| `entityPrefix`                 | Prefix added to table / collection names.                    |
| `entitySkipConstructor`        | Skip constructors when hydrating entities.                   |
| `relationLoadStrategy`         | `join` or `query`.                                           |
| `extra`                        | Extra driver-specific options.                               |
| `transactions.maxHookHandlers` | Max listeners for transaction hook emitters.                 |

### Driver-specific config blocks

The block name must match `persistence.type`:

-   `better-sqlite3.database`
-   `postgres.host`, `postgres.port`, `postgres.username`, `postgres.password`, `postgres.database`, ...
-   `mongodb.url` or `mongodb.host` / `mongodb.port`, plus `mongodb.database`, auth, SSL, read preference, retry options, and other Mongo client settings
-   corresponding TypeORM driver options for `mysql`, `mariadb`, `sqlite`, `mssql`, `oracle`, `cockroachdb`, `sap`, `spanner`, `aurora-mysql`, and `aurora-postgres`

The source types for these options live under `src/property/*ConnectionProperties.ts` in this package and closely follow TypeORM driver options.

---

## ⚠️ Important Behavior

-   `@EnableRepositories()` requires a valid `persistence` config node.
-   Repositories are auto-discovered from `@DataRepository(...)` metadata.
-   SQL startup runs a **consistency check** after sync / migrations and will fail fast if registered entities do not match discovered tables.
-   MongoDB gets a DI-managed `MongoClient` automatically when available.
-   Persistence connections are closed automatically on shutdown.

---

## 📚 Related APIs Exported by This Package

### Decorators

-   `@EnableRepositories()`
-   `@DataRepository(entity)`
-   `@Transactional()`
-   `@Migration()`
-   `@EntityEventSubscriber()`
-   `@PersistenceNamingStrategy()`
-   `@PersistenceCache()`
-   `@DatasourceConfiguration(options)`

### Helpers

-   `runInTransaction(...)`
-   `runOnTransactionCommit(...)`
-   `runOnTransactionRollback(...)`
-   `runOnTransactionComplete(...)`
-   `useEntityManager(...)`
-   `useQueryRunner(...)`
-   `useMongoClient(...)`
-   `useMongoCollection(...)`
-   `useMongoEntityManager(...)`
-   `useMongoQueryRunner(...)`

### Repository bases

-   `PagingAndSortingRepository<T>`
-   `MongoPagingAndSortingRepository<T>`

---

## 🎉 Conclusion

`@nodeboot/starter-persistence` gives Node-Boot applications a full persistence foundation with very little setup.

If you want Spring-Boot-style persistence for Node.js—repositories, transactions, migrations, listeners, paging, cache, logging, and Mongo/SQL support—this is the starter that wires it together.
