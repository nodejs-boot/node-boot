import {AdvisedRequest, AdvisedResponse, CallAroundAdvisor, CallAroundAdvisorChain} from "./Advisor";
import {SearchRequest, VectorStore} from "../../vectorstore";
import {Prompt} from "../../prompt";
import {PromptTemplate} from "../../prompt";
import {Message, UserMessage} from "../messages";

export class QuestionAnswerAdvisorBuilder {
    private readonly vectorStore: VectorStore;
    private searchReq?: Partial<SearchRequest>;
    private template?: PromptTemplate;
    private orderValue: number = 10;

    constructor(vectorStore: VectorStore) {
        this.vectorStore = vectorStore;
    }

    searchRequest(request: Partial<SearchRequest>): this {
        this.searchReq = request;
        return this;
    }

    promptTemplate(template: PromptTemplate): this {
        this.template = template;
        return this;
    }

    userTextAdvise(templateText: string): this {
        this.template = new PromptTemplate(templateText);
        return this;
    }

    order(order: number): this {
        this.orderValue = order;
        return this;
    }

    build(): QuestionAnswerAdvisor {
        return new QuestionAnswerAdvisor(this.vectorStore, {
            searchRequest: this.searchReq,
            promptTemplate: this.template,
            order: this.orderValue,
        });
    }
}

export class QuestionAnswerAdvisor implements CallAroundAdvisor {
    public static readonly FILTER_EXPRESSION = "FILTER_EXPRESSION";

    private readonly vectorStore: VectorStore;
    private readonly order: number;
    private readonly searchRequestConfig?: Partial<SearchRequest>;
    private readonly promptTemplate: PromptTemplate;

    constructor(
        vectorStore: VectorStore,
        options?: {
            order?: number;
            topK?: number;
            searchRequest?: Partial<SearchRequest>;
            promptTemplate?: PromptTemplate;
            userTextAdviseTemplate?: string;
        },
    ) {
        this.vectorStore = vectorStore;
        this.order = options?.order ?? 10;
        this.searchRequestConfig = options?.searchRequest ?? (options?.topK ? {topK: options.topK} : undefined);

        if (options?.promptTemplate) {
            this.promptTemplate = options.promptTemplate;
        } else if (options?.userTextAdviseTemplate) {
            this.promptTemplate = new PromptTemplate(options.userTextAdviseTemplate);
        } else {
            this.promptTemplate = new PromptTemplate(
                "Context information is below.\n" +
                    "---------------------\n" +
                    "{question_answer_context}\n" +
                    "---------------------\n" +
                    "Given the context information and not prior knowledge, answer the query.\n" +
                    "Query: {query}",
            );
        }
    }

    static builder(vectorStore: VectorStore): QuestionAnswerAdvisorBuilder {
        return new QuestionAnswerAdvisorBuilder(vectorStore);
    }

    getName(): string {
        return "QuestionAnswerAdvisor";
    }

    getOrder(): number {
        return this.order;
    }

    async aroundCall(request: AdvisedRequest, chain: CallAroundAdvisorChain): Promise<AdvisedResponse> {
        const instructions = request.prompt.getInstructions();
        const lastUserMessage = [...instructions].reverse().find(m => m.messageType === "user");

        if (!lastUserMessage) {
            return chain.nextAroundCall(request);
        }

        const query = lastUserMessage.text;

        // Support dynamic runtime FILTER_EXPRESSION from advisor context or params
        const dynamicFilter =
            request.context?.[QuestionAnswerAdvisor.FILTER_EXPRESSION] ??
            request.userParams?.[QuestionAnswerAdvisor.FILTER_EXPRESSION] ??
            this.searchRequestConfig?.filter;

        const documents = await this.vectorStore.similaritySearch({
            query,
            topK: this.searchRequestConfig?.topK ?? 4,
            similarityThreshold: this.searchRequestConfig?.similarityThreshold ?? 0.0,
            filter: dynamicFilter,
        });

        const context = documents.map(doc => doc.text).join("\n\n");
        const augmentedText = this.promptTemplate.render({
            question_answer_context: context,
            context,
            query,
            question: query,
        });

        const newInstructions: Message[] = instructions.map(m => {
            if (m === lastUserMessage) {
                return new UserMessage({
                    text: augmentedText,
                    media: lastUserMessage.media,
                    metadata: {...lastUserMessage.metadata, ragDocuments: documents},
                });
            }
            return m;
        });

        const advisedPrompt = new Prompt(newInstructions, request.prompt.getOptions());
        const advisedRequest: AdvisedRequest = {
            ...request,
            prompt: advisedPrompt,
            context: {
                ...request.context,
                ragDocuments: documents,
            },
        };

        return chain.nextAroundCall(advisedRequest);
    }
}
