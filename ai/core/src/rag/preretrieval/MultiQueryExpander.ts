import {Query} from "../query";
import {QueryExpander} from "./QueryExpander";
import {ChatClient, ChatClientBuilder} from "../../chat/client";
import {PromptTemplate} from "../../prompt";
import {ListOutputConverter} from "../../output";

export class MultiQueryExpanderBuilder {
    private clientBuilder?: ChatClientBuilder;
    private client?: ChatClient;
    private numQueries: number = 3;
    private incOriginal: boolean = true;
    private template?: PromptTemplate;

    chatClientBuilder(builder: ChatClientBuilder): this {
        this.clientBuilder = builder;
        return this;
    }

    chatClient(client: ChatClient): this {
        this.client = client;
        return this;
    }

    numberOfQueries(num: number): this {
        this.numQueries = num;
        return this;
    }

    includeOriginal(include: boolean): this {
        this.incOriginal = include;
        return this;
    }

    promptTemplate(template: PromptTemplate): this {
        this.template = template;
        return this;
    }

    build(): MultiQueryExpander {
        const chatClient = this.client ?? this.clientBuilder?.build();
        if (!chatClient) {
            throw new Error("ChatClient or ChatClientBuilder is required for MultiQueryExpander");
        }
        return new MultiQueryExpander({
            chatClient,
            numberOfQueries: this.numQueries,
            includeOriginal: this.incOriginal,
            promptTemplate: this.template,
        });
    }
}

export class MultiQueryExpander implements QueryExpander {
    private readonly chatClient: ChatClient;
    private readonly numberOfQueries: number;
    private readonly includeOriginal: boolean;
    private readonly promptTemplate: PromptTemplate;
    private readonly outputConverter = new ListOutputConverter();

    constructor(options: {
        chatClient: ChatClient;
        numberOfQueries?: number;
        includeOriginal?: boolean;
        promptTemplate?: PromptTemplate;
    }) {
        this.chatClient = options.chatClient;
        this.numberOfQueries = options.numberOfQueries ?? 3;
        this.includeOriginal = options.includeOriginal ?? true;
        this.promptTemplate =
            options.promptTemplate ??
            new PromptTemplate(
                "You are an AI language model assistant. Your task is to generate {count} different versions of the given user query to retrieve relevant documents from a vector database.\n" +
                    "By generating multiple perspectives on the user question, your goal is to help overcome some of the limitations of distance-based similarity search.\n" +
                    "Provide these alternative queries separated by newlines or as a JSON array.\n\n" +
                    "Original query: {query}\n" +
                    "Alternative queries:",
            );
    }

    static builder(): MultiQueryExpanderBuilder {
        return new MultiQueryExpanderBuilder();
    }

    async expand(query: Query): Promise<Query[]> {
        const promptText = this.promptTemplate.render({
            count: this.numberOfQueries,
            query: query.text,
        });

        const rawResponse = await this.chatClient.prompt().user(promptText).call().content();

        const lines = this.outputConverter.parse(rawResponse);
        const queries: Query[] = [];

        if (this.includeOriginal) {
            queries.push(query);
        }

        for (const line of lines) {
            const cleaned = line
                .trim()
                .replace(/^[-*0-9.)\s]+/, "")
                .trim();
            if (cleaned.length > 0 && cleaned !== query.text) {
                queries.push(query.mutate().text(cleaned).build());
            }
        }

        return queries.length > 0 ? queries : [query];
    }
}
