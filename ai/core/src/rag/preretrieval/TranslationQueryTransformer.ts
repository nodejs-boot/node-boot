import {Query} from "../query";
import {QueryTransformer} from "./QueryTransformer";
import {ChatClient, ChatClientBuilder} from "../../chat/client";
import {PromptTemplate} from "../../prompt";

export class TranslationQueryTransformerBuilder {
    private clientBuilder?: ChatClientBuilder;
    private client?: ChatClient;
    private targetLang: string = "english";
    private template?: PromptTemplate;

    chatClientBuilder(builder: ChatClientBuilder): this {
        this.clientBuilder = builder;
        return this;
    }

    chatClient(client: ChatClient): this {
        this.client = client;
        return this;
    }

    targetLanguage(targetLanguage: string): this {
        this.targetLang = targetLanguage;
        return this;
    }

    promptTemplate(template: PromptTemplate): this {
        this.template = template;
        return this;
    }

    build(): TranslationQueryTransformer {
        const chatClient = this.client ?? this.clientBuilder?.build();
        if (!chatClient) {
            throw new Error("ChatClient or ChatClientBuilder is required for TranslationQueryTransformer");
        }
        return new TranslationQueryTransformer({
            chatClient,
            targetLanguage: this.targetLang,
            promptTemplate: this.template,
        });
    }
}

export class TranslationQueryTransformer implements QueryTransformer {
    private readonly chatClient: ChatClient;
    private readonly targetLanguage: string;
    private readonly promptTemplate: PromptTemplate;

    constructor(options: {chatClient: ChatClient; targetLanguage?: string; promptTemplate?: PromptTemplate}) {
        this.chatClient = options.chatClient;
        this.targetLanguage = options.targetLanguage ?? "english";
        this.promptTemplate =
            options.promptTemplate ??
            new PromptTemplate(
                "You are an expert translator for search systems.\n" +
                    "Translate the following user query into {targetLanguage}.\n" +
                    "If the query is already in {targetLanguage} or language cannot be determined, return it as is.\n" +
                    "Return ONLY the translated query without any extra commentary.\n\n" +
                    "Query: {query}\n" +
                    "Translation:",
            );
    }

    static builder(): TranslationQueryTransformerBuilder {
        return new TranslationQueryTransformerBuilder();
    }

    async transform(query: Query): Promise<Query> {
        const promptText = this.promptTemplate.render({
            targetLanguage: this.targetLanguage,
            query: query.text,
        });

        const translated = await this.chatClient.prompt().user(promptText).call().content();

        const cleaned = translated.trim().replace(/^["']|["']$/g, "");
        return query
            .mutate()
            .text(cleaned || query.text)
            .build();
    }
}
