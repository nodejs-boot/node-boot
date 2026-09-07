/**
 * Supported storage backends for the `ChatMemory` bean wired by `@EnableChatMemory(...)`.
 *
 * - `"memory"` (default) — `InMemoryChatMemoryRepository`, no persistence required.
 * - `"sql"` — `SqlChatMemoryRepository`, requires `@EnableRepositories()` with a relational
 *   `persistence.type` (see `@nodeboot/starter-persistence`).
 * - `"mongo"` — `MongoChatMemoryRepository`, requires `@EnableRepositories()` with
 *   `persistence.type: mongodb`.
 */
export type ChatMemoryBackend = "memory" | "sql" | "mongo";

export interface ChatMemoryOptions {
    /**
     * The storage backend to use. Defaults to `"memory"`.
     */
    type?: ChatMemoryBackend;

    /**
     * The maximum number of messages retained per conversation by the underlying
     * `MessageWindowChatMemory`. Defaults to `MessageWindowChatMemory.DEFAULT_MAX_MESSAGES` (20).
     */
    maxMessages?: number;
}
