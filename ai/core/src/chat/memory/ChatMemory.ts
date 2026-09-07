import {Message} from "../messages";
import {ChatMemoryRepository} from "./ChatMemoryRepository";

/**
 * The information that a large-language model retains and uses to maintain contextual awareness
 * throughout a conversation. This is distinct from the full chat *history* (every message ever
 * exchanged) — a `ChatMemory` implementation decides which messages are relevant enough to keep
 * (e.g. the last N messages) and delegates actual storage to a {@link ChatMemoryRepository}.
 *
 * Every operation is keyed on a conversation id, which must always be provided explicitly — there
 * is no default conversation. See {@link ChatMemory.CONVERSATION_ID} for the conventional key used
 * to pass the conversation id through advisor parameters.
 */
export interface ChatMemory {
    /**
     * Adds one or more messages to the given conversation.
     */
    add(conversationId: string, messages: Message | Message[]): Promise<void> | void;

    /**
     * Returns the messages currently retained for the given conversation, in ascending
     * (oldest-to-newest) order.
     */
    get(conversationId: string): Promise<Message[]> | Message[];

    /**
     * Removes every message retained for the given conversation.
     */
    clear(conversationId: string): Promise<void> | void;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ChatMemory {
    /**
     * Conventional key used to pass the conversation id as an advisor/prompt parameter, e.g.:
     *
     * ```typescript
     * chatClient.prompt()
     *     .user(userInput)
     *     .param(ChatMemory.CONVERSATION_ID, conversationId)
     *     .call()
     *     .content();
     * ```
     */
    export const CONVERSATION_ID = "chat_memory_conversation_id";
}
