---
name: nodeboot-starter-persistence-mongodb
description: Use when the user wants MongoDB persistence in a Node-Boot app via `@nodeboot/starter-persistence` and TypeORM's Mongo driver — `persistence.type: mongodb`. Covers Mongo entity shape (`@ObjectIdColumn`/`_id`), `MongoRepository<T>`, `MongoPagingAndSortingRepository<T>` cursor-based paging, entity subscribers, and injecting `MongoClient` directly. This is the MongoDB flavour of `nodeboot-starter-persistence`; use `nodeboot-starter-persistence-sql` instead for relational databases.
---

# `@nodeboot/starter-persistence` — MongoDB flavour

Load [`../nodeboot-starter-persistence/SKILL.md`](../nodeboot-starter-persistence/SKILL.md) first
for the shared basics (`@EnableRepositories()`, `@DataRepository`, transactions). This skill covers
what's specific to `persistence.type: mongodb`.

## Fresh start or existing app?

Read [`../_shared/fresh-vs-existing.md`](../_shared/fresh-vs-existing.md) first, then apply it
here:

-   **Fresh start:** `npx degit nodejs-boot/node-boot/samples/sample-express-mongodb my-app` — the
    canonical MongoDB reference sample, including cursor-based paging and entity subscribers.
-   **Existing app:** check `persistence.type: mongodb` in `app-config.yaml`. There is **no**
    `src/persistence/migrations/` folder in the Mongo flavour (TypeORM migrations don't apply to
    Mongo) — its absence alongside a Mongo config is a strong signal this is already the MongoDB
    flavour, not just an unconfigured SQL app.

## Entity shape

Mongo entities use `@ObjectIdColumn` instead of `@PrimaryGeneratedColumn`:

```typescript
import {Column, Entity, ObjectIdColumn} from "typeorm";

@Entity("users")
export class User {
    @ObjectIdColumn()
    _id?: string;

    @Column()
    email: string;
}
```

## Repository + paging

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

`MongoPagingAndSortingRepository<T>` (extend instead of `MongoRepository<T>` for a paging
repository) provides `findById(id)`, `findPaginated(filter, options)` (page/pageSize, sort by
`_id` or another field), and `findCursorPaginated(filter, {pageSize, lastId, sortField, sortOrder})`
— Mongo cursor paging keys off `lastId` rather than a generic cursor value.

## Entity subscribers

The sample wires a per-entity and a global subscriber (`GlobalEntityEventListener`,
`UserEntityEventListener` in `src/persistence/listeners/`) — the same subscriber mechanism the base
`nodeboot-starter-persistence` skill documents, just demonstrated against Mongo entities.

## Key config

```yaml
persistence:
    type: "mongodb"
    cache: false
    mongodb:
        database: "facts"
        url: "${MONGODB_URL}"
```

Full docs: [`starters/persistence/README.md`](https://github.com/nodejs-boot/node-boot/blob/main/starters/persistence/README.md)
(§ "Configure the datasource", "Defining Entities" → MongoDB, "Paging and Sorting" → MongoDB,
"Injecting `MongoClient`"). Reference sample:
[`samples/sample-express-mongodb`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-express-mongodb).

## Validate

`cd samples/sample-express-mongodb && pnpm dev`

Writing integration tests against MongoDB persistence? See
[`nodeboot-test-mongodb`](../nodeboot-test-mongodb/SKILL.md).
