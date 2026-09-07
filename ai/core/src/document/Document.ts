export interface DocumentOptions {
    id?: string;
    text: string;
    metadata?: Record<string, any>;
    embedding?: number[];
}

export class Document {
    readonly id: string;
    readonly text: string;
    readonly metadata: Record<string, any>;
    embedding?: number[];

    constructor(textOrOptions: string | DocumentOptions, metadata?: Record<string, any>) {
        if (typeof textOrOptions === "string") {
            this.id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
            this.text = textOrOptions;
            this.metadata = metadata ?? {};
        } else {
            this.id =
                textOrOptions.id ?? (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2));
            this.text = textOrOptions.text;
            this.metadata = {...(textOrOptions.metadata ?? {}), ...(metadata ?? {})};
            this.embedding = textOrOptions.embedding;
        }
    }

    getText(): string {
        return this.text;
    }

    getMetadata(): Record<string, any> {
        return this.metadata;
    }

    getId(): string {
        return this.id;
    }
}
