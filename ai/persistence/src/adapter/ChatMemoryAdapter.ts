import {
    ApplicationFeatureAdapter,
    ApplicationFeatureContext,
    IocContainer,
    Lifecycle,
    LoggerService,
} from "@nodeboot/context";
import {
    ChatMemoryRepository as ChatMemoryRepositoryContract,
    InMemoryChatMemoryRepository,
    MessageWindowChatMemory,
} from "@nodeboot/ai-core";
import {ChatMemoryBackend, ChatMemoryOptions} from "../decorator";
import {
    ChatMemoryMessageRepository,
    ChatMemoryMongoMessageRepository,
    MongoChatMemoryRepository,
    SqlChatMemoryRepository,
} from "../repository";

/**
 * Application lifecycle adapter that builds and registers the `ChatMemory` bean configured through
 * `@EnableChatMemory(...)`.
 *
 * Runs on the `"persistence.started"` phase so that, when a database-backed `type` is selected, the
 * matching TypeORM repository (bound to the DI container by `@nodeboot/starter-persistence` earlier
 * in the same phase) is guaranteed to be available. For `type: "memory"` (the default), persistence
 * isn't required at all — `"persistence.started"` still fires in that case, just without a database
 * connection.
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
@Lifecycle("persistence.started")
export class ChatMemoryAdapter implements ApplicationFeatureAdapter {
    constructor(private readonly options: ChatMemoryOptions) {}

    bind({logger, iocContainer}: ApplicationFeatureContext): void {
        const backend = this.options.type ?? "memory";
        const maxMessages = this.options.maxMessages ?? MessageWindowChatMemory.DEFAULT_MAX_MESSAGES;

        const repository = this.resolveRepository(backend, iocContainer, logger);

        const chatMemory = MessageWindowChatMemory.builder()
            .chatMemoryRepository(repository)
            .maxMessages(maxMessages)
            .build();

        iocContainer.set("ChatMemoryRepository", repository);
        iocContainer.set("ChatMemory", chatMemory);

        logger.info(`🧠 ChatMemory configured with '${backend}' repository (maxMessages=${maxMessages})`);
    }

    private resolveRepository(
        backend: ChatMemoryBackend,
        iocContainer: IocContainer,
        logger: LoggerService,
    ): ChatMemoryRepositoryContract {
        switch (backend) {
            case "sql":
                return new SqlChatMemoryRepository(
                    this.getPersistenceRepository(iocContainer, ChatMemoryMessageRepository, "sql"),
                );
            case "mongo":
                return new MongoChatMemoryRepository(
                    this.getPersistenceRepository(iocContainer, ChatMemoryMongoMessageRepository, "mongo"),
                );
            case "memory":
                logger.info("🧠 Using in-memory ChatMemoryRepository (no persistence configured)");
                return new InMemoryChatMemoryRepository();
            default:
                throw new Error(`Unsupported ChatMemory backend: "${backend}"`);
        }
    }

    private getPersistenceRepository<T>(
        iocContainer: IocContainer,
        target: new (...args: any[]) => T,
        backend: string,
    ): T {
        if (!iocContainer.has(target)) {
            throw new Error(
                `ChatMemory backend "${backend}" requires @EnableRepositories() with a matching ` +
                    `"persistence.type" configured (see @nodeboot/starter-persistence). No repository ` +
                    `was bound for "${target.name}" — is @EnableRepositories() applied to your application?`,
            );
        }
        return iocContainer.get(target);
    }
}
