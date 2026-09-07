# @nodeboot/ai-persistence

Database-backed [`ChatMemory`](https://github.com/nodejs-boot/node-boot/blob/main/ai/core/README.md#chat-memory)
implementations for [`@nodeboot/ai-core`](https://github.com/nodejs-boot/node-boot/blob/main/ai/core/README.md),
pluggable through a single `@EnableChatMemory(...)` class decorator, following the same repository
pattern used throughout [`@nodeboot/starter-persistence`](https://github.com/nodejs-boot/node-boot/blob/main/starters/persistence/README.md).

By default, `@nodeboot/ai-core` auto-configures an in-memory `ChatMemory` bean — fine for a single
process, but lost on every restart. `@nodeboot/ai-persistence` lets you back that same `ChatMemory`
abstraction with a real database instead, without changing anything else in your application:
`ChatClient`, advisors, and direct `ChatModel` usage keep working exactly the same way.

## Features

-   **`@EnableChatMemory({type: ...})` class decorator** — one decorator on your application class,
    following the same "opt-in feature" shape as `@EnableRepositories()`, `@HttpClient()`, etc.
-   **`SqlChatMemoryRepository`** — stores conversation messages in a relational database via
    TypeORM (any dialect supported by `@nodeboot/starter-persistence`: PostgreSQL, MySQL, MariaDB,
    SQLite/better-sqlite3, MSSQL, Oracle, CockroachDB, Aurora).
-   **`MongoChatMemoryRepository`** — stores conversation messages in MongoDB via TypeORM's Mongo
    driver.
-   **Zero unconditional entities** — the SQL and Mongo entities are only registered with the
    persistence layer for the backend you actually select; picking `"sql"` never pulls the Mongo
    entity into your `DataSource` (and vice versa).
-   Implements the exact `ChatMemoryRepository` contract from `@nodeboot/ai-core`, so it's a
    drop-in replacement for `InMemoryChatMemoryRepository` inside `MessageWindowChatMemory`.

## Installation

```bash
npm install @nodeboot/ai-persistence @nodeboot/ai-core @nodeboot/starter-persistence
```

Also install the driver matching your chosen backend (e.g. `pg` for PostgreSQL, `mysql2` for
MySQL, `better-sqlite3` for SQLite, or `mongodb` for MongoDB) — same as any other
`@nodeboot/starter-persistence`-based app.

## Usage

Apply `@EnableChatMemory(...)` alongside `@EnableAi()` (from `@nodeboot/ai-core`) and, for a
database-backed `type`, `@EnableRepositories()` (from `@nodeboot/starter-persistence`):

```typescript
import {EnableDI} from "@nodeboot/di";
import {EnableComponentScan} from "@nodeboot/scan";
import {NodeBootApplication, NodeBoot, NodeBootApp, NodeBootAppView} from "@nodeboot/core";
import {ExpressServer} from "@nodeboot/express-server";
import {EnableAi} from "@nodeboot/ai-core";
import {EnableRepositories} from "@nodeboot/starter-persistence";
import {EnableChatMemory} from "@nodeboot/ai-persistence";
import {Container} from "typedi";

@EnableDI(Container)
@EnableRepositories() // requires "persistence" config (see @nodeboot/starter-persistence)
@EnableAi()
@EnableChatMemory({type: "sql", maxMessages: 50})
@EnableComponentScan()
@NodeBootApplication()
export class MyApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

That's it — the `ChatMemory` bean resolved via `@Inject("ChatMemory")` (or injected into
`MessageChatMemoryAdvisor`/`ChatClient` as usual) is now backed by the database configured under
your app's `persistence` settings, instead of the default in-memory store:

```typescript
import {Inject, Service} from "@nodeboot/core";
import {ChatClient, ChatMemory, MessageChatMemoryAdvisor} from "@nodeboot/ai-core";

@Service()
export class AssistantService {
    constructor(
        @Inject() private readonly chatClient: ChatClient,
        @Inject("ChatMemory") private readonly chatMemory: ChatMemory,
    ) {}

    async chat(userInput: string, conversationId: string) {
        return this.chatClient
            .prompt()
            .user(userInput)
            .advisors(new MessageChatMemoryAdvisor({chatMemory: this.chatMemory}))
            .conversationId(conversationId)
            .call()
            .content();
    }
}
```

### `ChatMemoryOptions`

| Option        | Type                           | Default    | Description                                                                      |
| ------------- | ------------------------------ | ---------- | -------------------------------------------------------------------------------- |
| `type`        | `"memory" \| "sql" \| "mongo"` | `"memory"` | Storage backend. `"memory"` needs no persistence setup at all.                   |
| `maxMessages` | `number`                       | `20`       | Passed straight through to `MessageWindowChatMemory.builder().maxMessages(...)`. |

### SQL backend

```typescript
@EnableChatMemory({type: "sql"})
```

Requires `@EnableRepositories()` with a relational `persistence.type` (e.g. `postgres`, `mysql`,
`better-sqlite3`, ...). Messages are stored in a `nodeboot_chat_memory_messages` table
(`ChatMemoryMessageEntity`), automatically included in your `DataSource`'s `entities` — no manual
entity wiring needed. Enable `synchronize`/migrations as you would for any other entity in your
app.

### MongoDB backend

```typescript
@EnableChatMemory({type: "mongo"})
```

Requires `@EnableRepositories()` with `persistence.type: mongodb`. Messages are stored in a
`nodeboot_chat_memory_messages` collection (`ChatMemoryMongoMessageEntity`).

### In-memory (default)

```typescript
@EnableChatMemory() // same as @EnableChatMemory({type: "memory"})
```

Equivalent to not applying the decorator at all — provided mainly so `maxMessages` can still be
configured declaratively without reaching for a database.

## How it works

-   `@EnableChatMemory({type: "sql" | "mongo"})` calls `@nodeboot/starter-persistence`'s `DataRepository`
    decorator **imperatively** (not via `@` syntax) on an internal repository class, at the moment
    the decorator itself is evaluated — i.e. before `NodeBoot.run()` builds the `DataSource`. This
    is what keeps the unused backend's entity out of your `DataSource` entirely.
-   A `ChatMemoryAdapter` (`@Lifecycle("persistence.started")`) then runs once persistence has
    started (and, for database backends, right after `@nodeboot/starter-persistence` has bound your
    custom repositories into the DI container). It resolves the matching TypeORM repository,
    wraps it in `SqlChatMemoryRepository`/`MongoChatMemoryRepository`, builds a
    `MessageWindowChatMemory` around it, and registers `"ChatMemory"`/`"ChatMemoryRepository"` in
    the DI container — overriding `@nodeboot/ai-core`'s in-memory defaults.
-   If you pick a database backend but forget `@EnableRepositories()` (or configure the wrong
    `persistence.type`), `ChatMemoryAdapter` throws a clear error at startup rather than silently
    falling back to in-memory storage.

## Advanced: constructing `ChatMemory` manually with a `@Configuration` class

If you need full control over how the `ChatMemory` bean is built — e.g. custom `maxMessages` logic,
wiring in your own metrics/logging around it, or composing it with other beans — you can bypass
`@EnableChatMemory(...)` entirely and wire everything yourself in a plain `@Configuration` class:

```typescript
import {Bean, Configuration} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import {DataRepository} from "@nodeboot/starter-persistence";
import {MessageWindowChatMemory} from "@nodeboot/ai-core";
import {ChatMemoryMessageEntity, ChatMemoryMessageRepository, SqlChatMemoryRepository} from "@nodeboot/ai-persistence";

// Registers ChatMemoryMessageRepository/ChatMemoryMessageEntity with the persistence layer —
// exactly what @EnableChatMemory({ type: "sql" }) does under the hood. This must run at
// module-load time (top-level, outside the class), before @nodeboot/starter-persistence builds
// its DataSource.
DataRepository(ChatMemoryMessageEntity)(ChatMemoryMessageRepository);

@Configuration()
export class ChatMemoryConfiguration {
    @Bean()
    public configureChatMemory({iocContainer, lifecycleBridge, logger}: BeansContext): void {
        // "persistence.started" guarantees @nodeboot/starter-persistence has already bound a
        // fully-constructed ChatMemoryMessageRepository instance into the DI container — the same
        // guarantee ChatMemoryAdapter (used internally by @EnableChatMemory) relies on. Resolving
        // the repository outside this callback (e.g. directly in the @Bean method body) is unsafe:
        // bean configuration order isn't guaranteed relative to when persistence finishes connecting.
        lifecycleBridge.subscribe("persistence.started", () => {
            const repository = new SqlChatMemoryRepository(iocContainer.get(ChatMemoryMessageRepository));

            const chatMemory = MessageWindowChatMemory.builder()
                .chatMemoryRepository(repository)
                .maxMessages(50)
                .build();

            // Overrides @nodeboot/ai-core's default in-memory beans, same keys @EnableChatMemory uses.
            iocContainer.set("ChatMemoryRepository", repository);
            iocContainer.set("ChatMemory", chatMemory);

            logger.info("🧠 ChatMemory configured manually via ChatMemoryConfiguration");
        });
    }
}
```

Apply `@EnableRepositories()` on your application class as usual, then make sure
`ChatMemoryConfiguration` is imported/component-scanned (importing the module is enough — `@Configuration`
self-registers as a side effect of the decorator, no extra wiring required). The equivalent for
MongoDB swaps in `ChatMemoryMongoMessageEntity` + `ChatMemoryMongoMessageRepository` +
`MongoChatMemoryRepository`.

## Caveats

-   **`saveAll` is delete-then-insert, not a diff or an append.** Following the same "replace"
    semantics as `InMemoryChatMemoryRepository`/Spring's `JdbcChatMemoryRepository`, every call to
    `saveAll(conversationId, messages)` deletes all previously stored rows for that conversation and
    re-inserts the given list. This is **not wrapped in a single database transaction**, so a crash
    mid-`saveAll` can, in rare cases, leave a conversation temporarily empty. Acceptable for typical
    chat-memory workloads; a future release may make this atomic.
-   **Tool calls / tool responses are round-tripped through JSON metadata.** `AssistantMessage`
    tool calls and `ToolResponseMessage` payloads are serialized into the stored row's metadata
    column (`simple-json` for SQL, a plain document field for Mongo) rather than dedicated columns.
    Binary `Media` attachments on `UserMessage` are serialized the same way — large binary payloads
    (e.g. raw image bytes as a `Buffer`) will not round-trip byte-for-byte; prefer passing media by
    URL/reference when persisting is enabled.
-   **MongoDB tests in this package use a fake repository, not a real MongoDB instance.** Unlike the
    SQL backend (tested against a real in-memory `better-sqlite3` TypeORM `DataSource`), this
    package's Mongo tests run against a hand-rolled object shaped like a TypeORM `MongoRepository`.
    If you need to validate `MongoChatMemoryRepository` against a real MongoDB server in your own
    test suite, use `mongodb-memory-server` (see the `nodeboot-test-mongodb` skill in the monorepo's
    `.agents/skills/` for the recommended `useMongoMemoryServer` pattern).

## Related

-   [`@nodeboot/ai-core`](https://github.com/nodejs-boot/node-boot/blob/main/ai/core/README.md#chat-memory) —
    the `ChatMemory`/`ChatMemoryRepository`/`MessageWindowChatMemory` abstractions this package
    implements.
-   [`@nodeboot/starter-persistence`](https://github.com/nodejs-boot/node-boot/blob/main/starters/persistence/README.md) —
    the `@DataRepository`/`@EnableRepositories()` persistence layer this package builds on.
