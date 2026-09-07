import {Document} from "../../document";
import {VectorStore} from "../../vectorstore";
import {Query} from "../query";
import {DocumentRetriever, FILTER_EXPRESSION} from "./DocumentRetriever";

export type FilterExpressionType =
    | ((doc: Document) => boolean)
    | Record<string, any>
    | (() => ((doc: Document) => boolean) | Record<string, any>);

export class VectorStoreDocumentRetrieverBuilder {
    private store?: VectorStore;
    private threshold: number = 0.0;
    private topKResults: number = 4;
    private filterExpr?: FilterExpressionType;

    vectorStore(store: VectorStore): this {
        this.store = store;
        return this;
    }

    similarityThreshold(threshold: number): this {
        this.threshold = threshold;
        return this;
    }

    topK(topK: number): this {
        this.topKResults = topK;
        return this;
    }

    filterExpression(filter: FilterExpressionType): this {
        this.filterExpr = filter;
        return this;
    }

    build(): VectorStoreDocumentRetriever {
        if (!this.store) {
            throw new Error("VectorStore is required for VectorStoreDocumentRetriever");
        }
        return new VectorStoreDocumentRetriever({
            vectorStore: this.store,
            similarityThreshold: this.threshold,
            topK: this.topKResults,
            filterExpression: this.filterExpr,
        });
    }
}

export class VectorStoreDocumentRetriever implements DocumentRetriever {
    public static readonly FILTER_EXPRESSION = FILTER_EXPRESSION;
    private readonly vectorStore: VectorStore;
    private readonly similarityThreshold: number;
    private readonly topK: number;
    private readonly filterExpression?: FilterExpressionType;

    constructor(options: {
        vectorStore: VectorStore;
        similarityThreshold?: number;
        topK?: number;
        filterExpression?: FilterExpressionType;
    }) {
        this.vectorStore = options.vectorStore;
        this.similarityThreshold = options.similarityThreshold ?? 0.0;
        this.topK = options.topK ?? 4;
        this.filterExpression = options.filterExpression;
    }

    static builder(): VectorStoreDocumentRetrieverBuilder {
        return new VectorStoreDocumentRetrieverBuilder();
    }

    async retrieve(query: Query): Promise<Document[]> {
        // Request-level dynamic filter expression takes precedence
        let activeFilter: any = query.context[FILTER_EXPRESSION];

        if (!activeFilter && this.filterExpression) {
            if (typeof this.filterExpression === "function" && this.filterExpression.length === 0) {
                // Supplier function: () => Filter
                activeFilter = (this.filterExpression as () => any)();
            } else {
                activeFilter = this.filterExpression;
            }
        }

        return this.vectorStore.similaritySearch({
            query: query.text,
            similarityThreshold: this.similarityThreshold,
            topK: this.topK,
            filter: activeFilter,
        });
    }
}
