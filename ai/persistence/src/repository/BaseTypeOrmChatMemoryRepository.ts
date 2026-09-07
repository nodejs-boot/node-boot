import {Repository} from "typeorm";
import {ChatMemoryRepository, Message} from "@nodeboot/ai-core";
import {applyMessageToRow, ChatMemoryMessageRow, rowToMessage} from "../mapping/ChatMemoryRowMapper";

/**
 * Shared `ChatMemoryRepository` implementation for both SQL and Mongo backends. Concrete
 * subclasses only need to provide the entity-specific `findConversationIds` query (SQL uses a
 * `DISTINCT` query builder, Mongo uses the collection's `distinct` command) and a factory for a
 * fresh row/document instance.
 *
 * `saveAll` always replaces the full set of messages for a conversation (delete-then-insert)
 * rather than diffing — this mirrors `ChatMemoryRepository.saveAll`'s "replace" semantics and keeps
 * `sequenceId` ordering trivially consistent with the in-memory list handed to it by
 * `MessageWindowChatMemory`.
 */
export abstract class BaseTypeOrmChatMemoryRepository<T extends ChatMemoryMessageRow> implements ChatMemoryRepository {
    protected constructor(protected readonly repository: Repository<T>) {}

    abstract findConversationIds(): Promise<string[]>;

    async findByConversationId(conversationId: string): Promise<Message[]> {
        const rows = await this.repository.find({
            where: {conversationId} as any,
            order: {sequenceId: "ASC"} as any,
        });
        return rows.map(rowToMessage);
    }

    async saveAll(conversationId: string, messages: Message[]): Promise<void> {
        await this.repository.delete({conversationId} as any);

        if (messages.length === 0) {
            return;
        }

        const rows = messages.map((message, sequenceId) =>
            applyMessageToRow(this.createRow(), conversationId, sequenceId, message),
        );
        await this.repository.save(rows as any);
    }

    async deleteByConversationId(conversationId: string): Promise<void> {
        await this.repository.delete({conversationId} as any);
    }

    /**
     * Creates a fresh, empty row/entity instance to be populated by `applyMessageToRow`.
     */
    protected abstract createRow(): T;
}
