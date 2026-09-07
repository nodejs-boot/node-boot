import {OutputConverter} from "./OutputConverter";

export class MapOutputConverter implements OutputConverter<Record<string, any>> {
    getFormat(): string {
        return "Your response should be a valid JSON object representing key-value pairs.";
    }

    parse(text: string): Record<string, any> {
        let cleaned = text.trim();
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.slice(7);
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.slice(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.slice(0, -3);
        }
        cleaned = cleaned.trim();

        const parsed = JSON.parse(cleaned);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
            throw new Error(`Expected a JSON object but got ${typeof parsed}`);
        }
        return parsed;
    }
}
