import {Column, Entity, ObjectIdColumn} from "typeorm";
import {ObjectId} from "mongodb";

/**
 * TypeORM Mongo entity backing {@link MongoChatMemoryRepository}. Each document is a single stored
 * message belonging to a conversation, ordered within that conversation by `sequenceId`.
 *
 * Registered with the persistence layer (and therefore included in the TypeORM `DataSource`'s
 * `entities`) only when `@EnableChatMemory({type: "mongo"})` is used — see `EnableChatMemory.ts`.
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
@Entity("nodeboot_chat_memory_messages")
export class ChatMemoryMongoMessageEntity {
    @ObjectIdColumn()
    _id?: ObjectId;

    /**
     * Identifier of the conversation this message belongs to.
     */
    @Column()
    conversationId!: string;

    /**
     * Zero-based position of the message within its conversation, used to preserve
     * ascending (oldest-to-newest) ordering when reloading a conversation.
     */
    @Column()
    sequenceId!: number;

    /**
     * One of "user" | "assistant" | "system" | "tool" — mirrors `Message.messageType`.
     */
    @Column()
    messageType!: string;

    /**
     * The message's textual content (`Message.text`).
     */
    @Column()
    content!: string;

    /**
     * Bag holding the original `Message.metadata` plus any type-specific fields that don't fit the
     * common row shape (tool calls, tool response payloads, media attachments). See
     * `ChatMemoryRowMapper` for the exact shape.
     */
    @Column()
    metadata!: Record<string, any> | null;

    @Column()
    createdAt!: Date;
}
