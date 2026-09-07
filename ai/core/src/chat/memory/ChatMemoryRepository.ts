import {Message} from "../messages";

/**
 * Storage abstraction for chat memory. Its sole responsibility is to persist and retrieve the
 * messages associated with a conversation. It does **not** decide which messages to keep or
 * evict — that policy belongs to a {@link ChatMemory} implementation (e.g. `MessageWindowChatMemory`)
 * layered on top of a repository.
 */
export interface ChatMemoryRepository {
    /**
     * Returns the identifiers of every conversation currently stored in the repository.
     */
    findConversationIds(): Promise<string[]> | string[];

    /**
     * Returns the messages stored for the given conversation, in ascending (oldest-to-newest) order.
     * Returns an empty array if the conversation does not exist.
     */
    findByConversationId(conversationId: string): Promise<Message[]> | Message[];

    /**
     * Replaces the full set of messages stored for the given conversation with the provided list.
     */
    saveAll(conversationId: string, messages: Message[]): Promise<void> | void;

    /**
     * Removes all messages stored for the given conversation.
     */
    deleteByConversationId(conversationId: string): Promise<void> | void;
}

/**
 * {@link ChatMemoryRepository} implementation that stores messages in memory using a `Map`.
 * Data does not survive process restarts and is not shared across instances — suitable for
 * development, testing, or single-instance deployments.
 */
export class InMemoryChatMemoryRepository implements ChatMemoryRepository {
    private readonly store = new Map<string, Message[]>();

    findConversationIds(): string[] {
        return [...this.store.keys()];
    }

    findByConversationId(conversationId: string): Message[] {
        return [...(this.store.get(conversationId) ?? [])];
    }

    saveAll(conversationId: string, messages: Message[]): void {
        this.store.set(conversationId, [...messages]);
    }

    deleteByConversationId(conversationId: string): void {
        this.store.delete(conversationId);
    }
}
