import {Query} from "../query";
import {QueryTransformer} from "./QueryTransformer";
import {ChatClient, ChatClientBuilder} from "../../chat/client";
import {PromptTemplate} from "../../prompt";

export class CompressionQueryTransformerBuilder {
    private clientBuilder?: ChatClientBuilder;
    private client?: ChatClient;
    private template?: PromptTemplate;

    chatClientBuilder(builder: ChatClientBuilder): this {
        this.clientBuilder = builder;
        return this;
    }

    chatClient(client: ChatClient): this {
        this.client = client;
        return this;
    }

    promptTemplate(template: PromptTemplate): this {
        this.template = template;
        return this;
    }

    build(): CompressionQueryTransformer {
        const chatClient = this.client ?? this.clientBuilder?.build();
        if (!chatClient) {
            throw new Error("ChatClient or ChatClientBuilder is required for CompressionQueryTransformer");
        }
        return new CompressionQueryTransformer({
            chatClient,
            promptTemplate: this.template,
        });
    }
}

export class CompressionQueryTransformer implements QueryTransformer {
    private readonly chatClient: ChatClient;
    private readonly promptTemplate: PromptTemplate;

    constructor(options: {chatClient: ChatClient; promptTemplate?: PromptTemplate}) {
        this.chatClient = options.chatClient;
        this.promptTemplate =
            options.promptTemplate ??
            new PromptTemplate(
                "Given the following conversation history and a follow-up query, rephrase the follow-up query to be a standalone query that includes all necessary context from the conversation.\n" +
                    "Return ONLY the standalone query with no quotes, explanations, or additional text.\n\n" +
                    "Conversation History:\n{history}\n\n" +
                    "Follow-up Query: {query}\n" +
                    "Standalone Query:",
            );
    }

    static builder(): CompressionQueryTransformerBuilder {
        return new CompressionQueryTransformerBuilder();
    }

    async transform(query: Query): Promise<Query> {
        if (!query.history || query.history.length === 0) {
            return query;
        }

        const historyText = query.history.map(m => `${m.messageType.toUpperCase()}: ${m.text}`).join("\n");

        const promptText = this.promptTemplate.render({
            history: historyText,
            query: query.text,
        });

        const compressed = await this.chatClient.prompt().user(promptText).call().content();

        const cleaned = compressed.trim().replace(/^["']|["']$/g, "");
        return query
            .mutate()
            .text(cleaned || query.text)
            .build();
    }
}
