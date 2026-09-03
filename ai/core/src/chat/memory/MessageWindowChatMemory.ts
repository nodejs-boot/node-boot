import {ChatMemoryRepository, InMemoryChatMemoryRepository} from "./ChatMemoryRepository";
import {Message} from "../messages";
import {ChatMemory} from "./ChatMemory";

export class MessageWindowChatMemoryBuilder {
    private repository?: ChatMemoryRepository;
    private maxMessagesValue?: number;

    /**
     * The {@link ChatMemoryRepository} used to persist messages. Defaults to a fresh
     * {@link InMemoryChatMemoryRepository} if not provided.
     */
    chatMemoryRepository(repository: ChatMemoryRepository): this {
        this.repository = repository;
        return this;
    }

    /**
     * The maximum number of messages retained per conversation. Defaults to 20.
     */
    maxMessages(maxMessages: number): this {
        this.maxMessagesValue = maxMessages;
        return this;
    }

    build(): MessageWindowChatMemory {
        return new MessageWindowChatMemory({
            chatMemoryRepository: this.repository,
            maxMessages: this.maxMessagesValue,
        });
    }
}

/**
 * {@link ChatMemory} implementation that maintains a sliding window of messages up to a specified
 * maximum size. When the number of messages exceeds the maximum, older messages are evicted while
 * always preserving `SystemMessage` instances.
 *
 * ### Turn-boundary eviction
 * When eviction is needed, `MessageWindowChatMemory` always removes whole turns rather than cutting
 * mid-turn. A turn starts at a `UserMessage` and includes all subsequent assistant replies, tool
 * calls, and tool responses up to the next `UserMessage`. If the raw eviction point lands on a
 * non-user message (for example, an assistant reply in the middle of a tool-calling exchange), the
 * cut is advanced forward to the next `UserMessage` so that the kept window always begins at a
 * complete turn.
 *
 * This means `maxMessages` is an upper bound on the number of messages stored — the actual count
 * may be somewhat lower when snapping is needed to find the next turn boundary. If `maxMessages` is
 * smaller than a single complete turn, all non-system messages may be evicted until a new
 * `UserMessage` is added.
 *
 * This is the default {@link ChatMemory} implementation auto-configured by `@EnableAi()`.
 *
 * @example
 * ```typescript
 * const memory = MessageWindowChatMemory.builder()
 *     .maxMessages(10)
 *     .build();
 * ```
 */
export class MessageWindowChatMemory implements ChatMemory {
    static readonly DEFAULT_MAX_MESSAGES = 20;

    private readonly repository: ChatMemoryRepository;
    private readonly maxMessages: number;

    constructor(options?: {chatMemoryRepository?: ChatMemoryRepository; maxMessages?: number}) {
        this.repository = options?.chatMemoryRepository ?? new InMemoryChatMemoryRepository();
        this.maxMessages = options?.maxMessages ?? MessageWindowChatMemory.DEFAULT_MAX_MESSAGES;

        if (this.maxMessages <= 0) {
            throw new Error("maxMessages must be greater than 0");
        }
    }

    static builder(): MessageWindowChatMemoryBuilder {
        return new MessageWindowChatMemoryBuilder();
    }

    async add(conversationId: string, messages: Message | Message[]): Promise<void> {
        const toAdd = Array.isArray(messages) ? messages : [messages];
        if (toAdd.length === 0) {
            return;
        }

        const existing = await this.repository.findByConversationId(conversationId);
        const combined = [...existing, ...toAdd];
        await this.repository.saveAll(conversationId, this.applyWindow(combined));
    }

    async get(conversationId: string): Promise<Message[]> {
        return this.repository.findByConversationId(conversationId);
    }

    async clear(conversationId: string): Promise<void> {
        await this.repository.deleteByConversationId(conversationId);
    }

    /**
     * Trims `messages` down to at most `maxMessages`, always preserving `SystemMessage` instances
     * and snapping the eviction cut forward to the next `UserMessage` so that whole turns are kept.
     */
    private applyWindow(messages: Message[]): Message[] {
        if (messages.length <= this.maxMessages) {
            return messages;
        }

        const systemMessages = messages.filter(message => message.messageType === "system");
        const nonSystemMessages = messages.filter(message => message.messageType !== "system");

        // Budget available for non-system messages once system messages are guaranteed a slot.
        const budget = this.maxMessages - systemMessages.length;
        if (budget <= 0) {
            return systemMessages;
        }

        if (nonSystemMessages.length <= budget) {
            return [...systemMessages, ...nonSystemMessages];
        }

        // Raw cut point: how many leading non-system messages must be evicted to fit the budget.
        let cutIndex = nonSystemMessages.length - budget;

        // Snap the cut forward to the next UserMessage so eviction never splits a turn.
        while (cutIndex < nonSystemMessages.length && nonSystemMessages[cutIndex]?.messageType !== "user") {
            cutIndex++;
        }

        return [...systemMessages, ...nonSystemMessages.slice(cutIndex)];
    }
}
