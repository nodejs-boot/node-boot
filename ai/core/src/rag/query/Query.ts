import {Message} from "../../chat/messages";

export interface QueryOptions {
    text: string;
    history?: Message[];
    context?: Record<string, any>;
}

export class QueryBuilder {
    private textValue: string = "";
    private historyValue: Message[] = [];
    private contextValue: Record<string, any> = {};

    text(text: string): this {
        this.textValue = text;
        return this;
    }

    history(...messages: Message[]): this {
        this.historyValue.push(...messages);
        return this;
    }

    context(context: Record<string, any>): this {
        this.contextValue = {...this.contextValue, ...context};
        return this;
    }

    build(): Query {
        return new Query({
            text: this.textValue,
            history: this.historyValue,
            context: this.contextValue,
        });
    }
}

export class Query {
    readonly text: string;
    readonly history: Message[];
    readonly context: Record<string, any>;

    constructor(textOrOptions: string | QueryOptions) {
        if (typeof textOrOptions === "string") {
            this.text = textOrOptions;
            this.history = [];
            this.context = {};
        } else {
            this.text = textOrOptions.text;
            this.history = textOrOptions.history ?? [];
            this.context = textOrOptions.context ?? {};
        }
    }

    static builder(): QueryBuilder {
        return new QueryBuilder();
    }

    mutate(): QueryBuilder {
        return new QueryBuilder()
            .text(this.text)
            .history(...this.history)
            .context(this.context);
    }
}
