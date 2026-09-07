import {ApplicationContext} from "@nodeboot/context";
import {DataRepository} from "@nodeboot/starter-persistence";
import {ChatMemoryMessageEntity, ChatMemoryMongoMessageEntity} from "../entity";
import {ChatMemoryMessageRepository, ChatMemoryMongoMessageRepository} from "../repository";
import {ChatMemoryAdapter} from "../adapter";
import {ChatMemoryBackend, ChatMemoryOptions} from "./ChatMemoryOptions";

export * from "./ChatMemoryOptions";

/**
 * Registers the entity/repository pair matching `backend` with `PersistenceContext`, so that
 * `@nodeboot/starter-persistence` includes it in the TypeORM `DataSource`'s `entities` and binds a
 * ready-to-use repository instance to the DI container once persistence starts.
 *
 * This is done imperatively (calling the `@DataRepository` decorator function directly, instead of
 * applying it with `@DataRepository(...)` syntax at module scope on `ChatMemoryMessageRepository` /
 * `ChatMemoryMongoMessageRepository`) so that only the backend an application actually opts into
 * ever reaches TypeORM — a SQL app never sees the Mongo entity (with its `@ObjectIdColumn`) and
 * vice versa.
 *
 * Must run before `@nodeboot/starter-persistence` builds its `DataSource` (which freezes the
 * `entities` list). Since `@EnableChatMemory(options)` performs this registration synchronously, as
 * soon as it's evaluated — well before `NodeBoot.run()` bootstraps any bean — ordering is
 * guaranteed.
 */
function registerPersistenceEntity(backend: ChatMemoryBackend): void {
    if (backend === "sql") {
        DataRepository(ChatMemoryMessageEntity)(ChatMemoryMessageRepository);
    } else if (backend === "mongo") {
        DataRepository(ChatMemoryMongoMessageEntity)(ChatMemoryMongoMessageRepository);
    }
}

/**
 * Class decorator that enables and configures a `ChatMemory` bean, pluggable across storage
 * backends — in-memory, SQL, or MongoDB — following the same repository pattern used throughout
 * `@nodeboot/starter-persistence`.
 *
 * Apply it once on your application class, alongside `@EnableAi()` (and `@EnableRepositories()` if
 * you pick a database-backed `type`):
 *
 * @example
 * ```typescript
 * import { EnableAi } from "@nodeboot/ai-core";
 * import { EnableChatMemory } from "@nodeboot/ai-persistence";
 * import { EnableRepositories } from "@nodeboot/starter-persistence";
 *
 * @EnableDI(Container)
 * @EnableRepositories()
 * @EnableAi()
 * @EnableChatMemory({ type: "sql", maxMessages: 50 })
 * @EnableComponentScan()
 * @NodeBootApplication()
 * export class MyApp implements NodeBootApp {
 *     start(): Promise<NodeBootAppView> {
 *         return NodeBoot.run(ExpressServer);
 *     }
 * }
 * ```
 *
 * The resulting `ChatMemory` (and the underlying `ChatMemoryRepository`) are registered in the DI
 * container under the `"ChatMemory"` / `"ChatMemoryRepository"` keys, overriding the default
 * in-memory bean auto-configured by `@EnableAi()` — inject them with `@Inject("ChatMemory")` or
 * resolve them from the IoC container.
 *
 * @param {ChatMemoryOptions} [options] - Backend selection and window size.
 * @returns {ClassDecorator} A no-op class decorator (all wiring happens as a side effect).
 */
export function EnableChatMemory(options?: ChatMemoryOptions): ClassDecorator {
    const backend = options?.type ?? "memory";
    registerPersistenceEntity(backend);

    return () => {
        ApplicationContext.get().applicationFeatureAdapters.push(new ChatMemoryAdapter(options ?? {}));
    };
}
