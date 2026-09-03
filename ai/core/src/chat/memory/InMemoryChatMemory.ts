import {ChatMemory} from "./ChatMemory";
import {Message} from "../messages";

/**
 * Simple {@link ChatMemory} implementation that stores every message for a conversation without
 * ever evicting them. Useful for short-lived scripts/tests; for production use prefer
 * {@link MessageWindowChatMemory}, which bounds memory growth.
 *
 * @deprecated Prefer {@link MessageWindowChatMemory} (backed by an {@link InMemoryChatMemoryRepository}
 * by default), which follows the same repository-backed design as every other Node-Boot AI memory type
 * and bounds the number of retained messages.
 */
export class InMemoryChatMemory implements ChatMemory {
    private readonly store = new Map<string, Message[]>();

    add(conversationId: string, messages: Message | Message[]): void {
        const existing = this.store.get(conversationId) ?? [];
        const toAdd = Array.isArray(messages) ? messages : [messages];
        this.store.set(conversationId, [...existing, ...toAdd]);
    }

    get(conversationId: string): Message[] {
        return [...(this.store.get(conversationId) ?? [])];
    }

    clear(conversationId: string): void {
        this.store.delete(conversationId);
    }
}
