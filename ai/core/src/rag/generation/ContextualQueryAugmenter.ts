import {Document} from "../../document";
import {Query} from "../query";
import {QueryAugmenter} from "./QueryAugmenter";
import {PromptTemplate} from "../../prompt";

export class ContextualQueryAugmenterBuilder {
    private allowEmpty: boolean = false;
    private template?: PromptTemplate;
    private emptyTemplate?: PromptTemplate;

    allowEmptyContext(allow: boolean): this {
        this.allowEmpty = allow;
        return this;
    }

    promptTemplate(template: PromptTemplate): this {
        this.template = template;
        return this;
    }

    emptyContextPromptTemplate(template: PromptTemplate): this {
        this.emptyTemplate = template;
        return this;
    }

    build(): ContextualQueryAugmenter {
        return new ContextualQueryAugmenter({
            allowEmptyContext: this.allowEmpty,
            promptTemplate: this.template,
            emptyContextPromptTemplate: this.emptyTemplate,
        });
    }
}

export class ContextualQueryAugmenter implements QueryAugmenter {
    private readonly allowEmptyContext: boolean;
    private readonly promptTemplate: PromptTemplate;
    private readonly emptyContextPromptTemplate: PromptTemplate;

    constructor(options?: {
        allowEmptyContext?: boolean;
        promptTemplate?: PromptTemplate;
        emptyContextPromptTemplate?: PromptTemplate;
    }) {
        this.allowEmptyContext = options?.allowEmptyContext ?? false;
        this.promptTemplate =
            options?.promptTemplate ??
            new PromptTemplate(
                "Context information is below.\n" +
                    "---------------------\n" +
                    "{context}\n" +
                    "---------------------\n" +
                    "Given the context information and no prior knowledge, answer the query.\n" +
                    "Query: {query}\n" +
                    "Answer:",
            );
        this.emptyContextPromptTemplate =
            options?.emptyContextPromptTemplate ??
            new PromptTemplate(
                "No context information was found to answer the query.\n" +
                    "Please inform the user that you don't know the answer based on the available context.\n" +
                    "Query: {query}",
            );
    }

    static builder(): ContextualQueryAugmenterBuilder {
        return new ContextualQueryAugmenterBuilder();
    }

    async augment(query: Query, documents: Document[]): Promise<Query> {
        if (!documents || documents.length === 0) {
            if (this.allowEmptyContext) {
                return query;
            }
            const augmentedText = this.emptyContextPromptTemplate.render({
                query: query.text,
            });
            return query.mutate().text(augmentedText).context({ragDocuments: []}).build();
        }

        const context = documents.map(d => d.text).join("\n\n");
        const augmentedText = this.promptTemplate.render({
            context,
            query: query.text,
        });

        return query.mutate().text(augmentedText).context({ragDocuments: documents}).build();
    }
}
