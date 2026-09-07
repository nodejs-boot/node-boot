import {AdvisedRequest, AdvisedResponse, CallAroundAdvisor, CallAroundAdvisorChain} from "./Advisor";
import {ChatMemory, MessageWindowChatMemory} from "../memory";
import {Prompt} from "../../prompt";
import {Message} from "../messages";

export class MessageChatMemoryAdvisor implements CallAroundAdvisor {
    private readonly chatMemory: ChatMemory;
    private readonly defaultConversationId?: string;
    private readonly order: number;

    constructor(options?: {chatMemory?: ChatMemory; defaultConversationId?: string; order?: number}) {
        this.chatMemory = options?.chatMemory ?? MessageWindowChatMemory.builder().build();
        this.defaultConversationId = options?.defaultConversationId;
        this.order = options?.order ?? 0;
    }

    getName(): string {
        return "MessageChatMemoryAdvisor";
    }

    getOrder(): number {
        return this.order;
    }

    async aroundCall(request: AdvisedRequest, chain: CallAroundAdvisorChain): Promise<AdvisedResponse> {
        const conversationId =
            request.conversationId ?? request.userParams?.[ChatMemory.CONVERSATION_ID] ?? this.defaultConversationId;

        if (!conversationId) {
            throw new Error(
                "ChatMemory.CONVERSATION_ID must be provided (via .conversationId(...) or " +
                    ".param(ChatMemory.CONVERSATION_ID, ...)) to use MessageChatMemoryAdvisor",
            );
        }

        const memoryMessages = await this.chatMemory.get(conversationId);

        // Prepend conversation history to current prompt messages (preserving system messages at the top if present)
        const incomingInstructions = request.prompt.getInstructions();
        const systemMessages: Message[] = [];
        const nonSystemMessages: Message[] = [];

        for (const msg of incomingInstructions) {
            if (msg.messageType === "system") {
                systemMessages.push(msg);
            } else {
                nonSystemMessages.push(msg);
            }
        }

        const combinedMessages: Message[] = [...systemMessages, ...memoryMessages, ...nonSystemMessages];

        const advisedPrompt = new Prompt(combinedMessages, request.prompt.getOptions());
        const advisedRequest: AdvisedRequest = {
            ...request,
            prompt: advisedPrompt,
        };

        const result = await chain.nextAroundCall(advisedRequest);

        // Save new user messages and assistant generation to memory
        const newMessagesToPersist: Message[] = [];
        for (const msg of nonSystemMessages) {
            newMessagesToPersist.push(msg);
        }

        if (result.response.result?.message) {
            newMessagesToPersist.push(result.response.result.message);
        }

        if (newMessagesToPersist.length > 0) {
            await this.chatMemory.add(conversationId, newMessagesToPersist);
        }

        return result;
    }
}
