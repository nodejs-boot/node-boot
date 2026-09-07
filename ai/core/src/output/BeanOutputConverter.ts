import {OutputConverter} from "./OutputConverter";

export interface JsonSchemaTarget<T> {
    jsonSchema?: Record<string, any>;
    parse?: (raw: any) => T;
}

export class BeanOutputConverter<T = any> implements OutputConverter<T> {
    private readonly jsonSchema?: Record<string, any>;
    private readonly parser?: (raw: any) => T;

    constructor(schemaOrTarget?: Record<string, any> | JsonSchemaTarget<T> | ((raw: any) => T)) {
        if (typeof schemaOrTarget === "function") {
            this.parser = schemaOrTarget as (raw: any) => T;
        } else if (schemaOrTarget && "jsonSchema" in schemaOrTarget) {
            this.jsonSchema = schemaOrTarget.jsonSchema;
            this.parser = schemaOrTarget.parse;
        } else if (schemaOrTarget) {
            this.jsonSchema = schemaOrTarget as Record<string, any>;
        }
    }

    getFormat(): string {
        let format =
            "Your response should be in JSON format. Do not include any markdown formatting, ```json tags or explanations.";
        if (this.jsonSchema) {
            format += `\nHere is the JSON Schema instance your answer must adhere to:\n${JSON.stringify(
                this.jsonSchema,
                null,
                2,
            )}`;
        }
        return format;
    }

    getJsonSchema(): Record<string, any> | undefined {
        return this.jsonSchema;
    }

    parse(text: string): T {
        let cleaned = text.trim();
        // Strip markdown code fences if LLM included them
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.slice(7);
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.slice(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.slice(0, -3);
        }
        cleaned = cleaned.trim();

        const json = JSON.parse(cleaned);
        if (this.parser) {
            return this.parser(json);
        }
        return json as T;
    }
}
