import {MongoRepository} from "typeorm";
import {useMongoCollection} from "@nodeboot/starter-persistence";
import {ChatMemoryMongoMessageEntity} from "../entity/ChatMemoryMongoMessageEntity";
import {BaseTypeOrmChatMemoryRepository} from "./BaseTypeOrmChatMemoryRepository";

/**
 * {@link ChatMemoryRepository} implementation backed by MongoDB via TypeORM's Mongo driver.
 *
 * Typically obtained automatically through `@EnableChatMemory({type: "mongo"})` rather than constructed
 * directly; construct it yourself only if you need a `ChatMemory` outside of the standard
 * `@EnableChatMemory` wiring (e.g. a bean produced by a custom `@Configuration`).
 *
 * @example
 * ```typescript
 * const repository = new MongoChatMemoryRepository(iocContainer.get(ChatMemoryMongoMessageRepository));
 * const chatMemory = MessageWindowChatMemory.builder().chatMemoryRepository(repository).build();
 * ```
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
export class MongoChatMemoryRepository extends BaseTypeOrmChatMemoryRepository<ChatMemoryMongoMessageEntity> {
    constructor(repository: MongoRepository<ChatMemoryMongoMessageEntity>) {
        super(repository);
    }

    async findConversationIds(): Promise<string[]> {
        return useMongoCollection<ChatMemoryMongoMessageEntity>(this.repository).distinct("conversationId");
    }

    protected createRow(): ChatMemoryMongoMessageEntity {
        return new ChatMemoryMongoMessageEntity();
    }
}
