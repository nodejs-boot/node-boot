import {AdvisedRequest, AdvisedResponse, CallAroundAdvisor, CallAroundAdvisorChain} from "../../chat/advisor/Advisor";
import {Prompt} from "../../prompt";
import {Message, UserMessage} from "../../chat/messages";
import {Query} from "../query";
import {QueryExpander, QueryTransformer} from "../preretrieval";
import {ConcatenationDocumentJoiner, DocumentJoiner, DocumentRetriever} from "../retrieval";
import {DocumentPostProcessor} from "../postretrieval";
import {ContextualQueryAugmenter, QueryAugmenter} from "../generation";
import {Document} from "../../document";

export class RetrievalAugmentationAdvisorBuilder {
    private transformers: QueryTransformer[] = [];
    private expander?: QueryExpander;
    private retriever?: DocumentRetriever;
    private joiner: DocumentJoiner = new ConcatenationDocumentJoiner();
    private postProcessors: DocumentPostProcessor[] = [];
    private augmenter: QueryAugmenter = new ContextualQueryAugmenter();
    private orderValue: number = 0;

    queryTransformers(...transformers: QueryTransformer[]): this {
        this.transformers.push(...transformers);
        return this;
    }

    queryExpander(expander: QueryExpander): this {
        this.expander = expander;
        return this;
    }

    documentRetriever(retriever: DocumentRetriever): this {
        this.retriever = retriever;
        return this;
    }

    documentJoiner(joiner: DocumentJoiner): this {
        this.joiner = joiner;
        return this;
    }

    documentPostProcessors(...postProcessors: DocumentPostProcessor[]): this {
        this.postProcessors.push(...postProcessors);
        return this;
    }

    queryAugmenter(augmenter: QueryAugmenter): this {
        this.augmenter = augmenter;
        return this;
    }

    order(order: number): this {
        this.orderValue = order;
        return this;
    }

    build(): RetrievalAugmentationAdvisor {
        if (!this.retriever) {
            throw new Error("DocumentRetriever is required for RetrievalAugmentationAdvisor");
        }
        return new RetrievalAugmentationAdvisor({
            queryTransformers: this.transformers,
            queryExpander: this.expander,
            documentRetriever: this.retriever,
            documentJoiner: this.joiner,
            documentPostProcessors: this.postProcessors,
            queryAugmenter: this.augmenter,
            order: this.orderValue,
        });
    }
}

export class RetrievalAugmentationAdvisor implements CallAroundAdvisor {
    private readonly queryTransformers: QueryTransformer[];
    private readonly queryExpander?: QueryExpander;
    private readonly documentRetriever: DocumentRetriever;
    private readonly documentJoiner: DocumentJoiner;
    private readonly documentPostProcessors: DocumentPostProcessor[];
    private readonly queryAugmenter: QueryAugmenter;
    private readonly order: number;

    constructor(options: {
        documentRetriever: DocumentRetriever;
        queryTransformers?: QueryTransformer[];
        queryExpander?: QueryExpander;
        documentJoiner?: DocumentJoiner;
        documentPostProcessors?: DocumentPostProcessor[];
        queryAugmenter?: QueryAugmenter;
        order?: number;
    }) {
        this.documentRetriever = options.documentRetriever;
        this.queryTransformers = options.queryTransformers ?? [];
        this.queryExpander = options.queryExpander;
        this.documentJoiner = options.documentJoiner ?? new ConcatenationDocumentJoiner();
        this.documentPostProcessors = options.documentPostProcessors ?? [];
        this.queryAugmenter = options.queryAugmenter ?? new ContextualQueryAugmenter();
        this.order = options.order ?? 0;
    }

    static builder(): RetrievalAugmentationAdvisorBuilder {
        return new RetrievalAugmentationAdvisorBuilder();
    }

    getName(): string {
        return "RetrievalAugmentationAdvisor";
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

        const history = instructions.filter(m => m !== lastUserMessage);

        let query = Query.builder()
            .text(lastUserMessage.text)
            .history(...history)
            .context(request.context ?? {})
            .build();

        // 1. Pre-Retrieval: Query Transformations
        for (const transformer of this.queryTransformers) {
            query = await transformer.transform(query);
        }

        // 2. Pre-Retrieval: Query Expansion
        const queries = this.queryExpander ? await this.queryExpander.expand(query) : [query];

        // 3. Retrieval: Query documents for each expanded query
        const documentsMap = new Map<Query, Document[][]>();
        for (const q of queries) {
            const docs = await this.documentRetriever.retrieve(q);
            documentsMap.set(q, [docs]);
        }

        // 4. Retrieval: Join retrieved documents
        let documents = await this.documentJoiner.join(documentsMap);

        // 5. Post-Retrieval: Post-Process documents
        for (const postProcessor of this.documentPostProcessors) {
            documents = await postProcessor.process(query, documents);
        }

        // 6. Generation: Augment query with context
        const augmentedQuery = await this.queryAugmenter.augment(query, documents);

        const newInstructions: Message[] = instructions.map(m => {
            if (m === lastUserMessage) {
                return new UserMessage({
                    text: augmentedQuery.text,
                    media: lastUserMessage.media,
                    metadata: {
                        ...lastUserMessage.metadata,
                        ragDocuments: documents,
                    },
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
