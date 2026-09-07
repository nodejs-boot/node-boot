import {Repository} from "typeorm";
import {ChatMemoryMessageEntity} from "../entity";
import {BaseTypeOrmChatMemoryRepository} from "./BaseTypeOrmChatMemoryRepository";

/**
 * {@link ChatMemoryRepository} implementation backed by a relational database via TypeORM
 * (PostgreSQL, MySQL, MariaDB, SQLite/better-sqlite3, MSSQL, Oracle, CockroachDB, Aurora — any
 * dialect supported by `@nodeboot/starter-persistence`).
 *
 * Typically obtained automatically through `@EnableChatMemory({type: "sql"})` rather than constructed
 * directly; construct it yourself only if you need a `ChatMemory` outside of the standard
 * `@EnableChatMemory` wiring (e.g. a bean produced by a custom `@Configuration`).
 *
 * @example
 * ```typescript
 * const repository = new SqlChatMemoryRepository(iocContainer.get(ChatMemoryMessageRepository));
 * const chatMemory = MessageWindowChatMemory.builder().chatMemoryRepository(repository).build();
 * ```
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
export class SqlChatMemoryRepository extends BaseTypeOrmChatMemoryRepository<ChatMemoryMessageEntity> {
    constructor(repository: Repository<ChatMemoryMessageEntity>) {
        super(repository);
    }

    async findConversationIds(): Promise<string[]> {
        const rows = await this.repository
            .createQueryBuilder("chat_memory_message")
            .select("DISTINCT chat_memory_message.conversationId", "conversationId")
            .getRawMany<{conversationId: string}>();
        return rows.map(row => row.conversationId);
    }

    protected createRow(): ChatMemoryMessageEntity {
        return new ChatMemoryMessageEntity();
    }
}
