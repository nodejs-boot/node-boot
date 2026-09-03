import {ChatResponse} from "../model";
import {BeanOutputConverter, JsonSchemaTarget, OutputConverter} from "../../output";

export class ChatClientResponseSpec {
    private readonly responsePromise: Promise<ChatResponse>;
    private readonly outputConverter?: OutputConverter<any>;

    constructor(responsePromise: Promise<ChatResponse>, outputConverter?: OutputConverter<any>) {
        this.responsePromise = responsePromise;
        this.outputConverter = outputConverter;
    }

    async chatResponse(): Promise<ChatResponse> {
        return this.responsePromise;
    }

    async content(): Promise<string> {
        const res = await this.responsePromise;
        return res.result?.message?.text ?? "";
    }

    async entity<T>(
        converterOrSchema?: OutputConverter<T> | Record<string, any> | JsonSchemaTarget<T> | ((raw: any) => T),
    ): Promise<T> {
        const text = await this.content();
        if (converterOrSchema) {
            if (
                typeof (converterOrSchema as any).parse === "function" &&
                typeof (converterOrSchema as any).getFormat === "function"
            ) {
                return (converterOrSchema as OutputConverter<T>).parse(text);
            }
            const converter = new BeanOutputConverter<T>(converterOrSchema as any);
            return converter.parse(text);
        }
        if (this.outputConverter) {
            return this.outputConverter.parse(text);
        }
        return JSON.parse(text) as T;
    }
}
