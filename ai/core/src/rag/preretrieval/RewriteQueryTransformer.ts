import {Query} from "../query";
import {QueryTransformer} from "./QueryTransformer";
import {ChatClient, ChatClientBuilder} from "../../chat/client";
import {PromptTemplate} from "../../prompt";

export class RewriteQueryTransformerBuilder {
    private clientBuilder?: ChatClientBuilder;
    private client?: ChatClient;
    private template?: PromptTemplate;
    private targetSearchSystem: string = "vector database";

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

    target(target: string): this {
        this.targetSearchSystem = target;
        return this;
    }

    build(): RewriteQueryTransformer {
        const chatClient = this.client ?? this.clientBuilder?.build();
        if (!chatClient) {
            throw new Error("ChatClient or ChatClientBuilder is required for RewriteQueryTransformer");
        }
        return new RewriteQueryTransformer({
            chatClient,
            promptTemplate: this.template,
            targetSearchSystem: this.targetSearchSystem,
        });
    }
}

export class RewriteQueryTransformer implements QueryTransformer {
    private readonly chatClient: ChatClient;
    private readonly promptTemplate: PromptTemplate;
    private readonly targetSearchSystem: string;

    constructor(options: {chatClient: ChatClient; promptTemplate?: PromptTemplate; targetSearchSystem?: string}) {
        this.chatClient = options.chatClient;
        this.targetSearchSystem = options.targetSearchSystem ?? "vector database";
        this.promptTemplate =
            options.promptTemplate ??
            new PromptTemplate(
                "You are an AI assistant specialized in rewriting queries for optimal retrieval in a {target}.\n" +
                    "Given the original query, rewrite it to be clear, specific, and keyword-rich for search.\n" +
                    "Return ONLY the rewritten query with no quotes, explanations, or additional text.\n\n" +
                    "Original query: {query}\n" +
                    "Rewritten query:",
            );
    }

    static builder(): RewriteQueryTransformerBuilder {
        return new RewriteQueryTransformerBuilder();
    }

    async transform(query: Query): Promise<Query> {
        const promptText = this.promptTemplate.render({
            target: this.targetSearchSystem,
            query: query.text,
        });

        const rewritten = await this.chatClient.prompt().user(promptText).call().content();

        const cleaned = rewritten.trim().replace(/^["']|["']$/g, "");
        return query
            .mutate()
            .text(cleaned || query.text)
            .build();
    }
}
