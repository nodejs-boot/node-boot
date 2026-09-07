import {OutputConverter} from "./OutputConverter";

export class ListOutputConverter implements OutputConverter<string[]> {
    getFormat(): string {
        return "Your response should be a comma-separated list of values, or a valid JSON array of strings.";
    }

    parse(text: string): string[] {
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

        if (cleaned.startsWith("[") && cleaned.endsWith("]")) {
            try {
                const parsed = JSON.parse(cleaned);
                if (Array.isArray(parsed)) {
                    return parsed.map(item => String(item).trim());
                }
            } catch {
                // fallback to comma separation
            }
        }

        return cleaned
            .split(",")
            .map(item => item.trim())
            .filter(item => item.length > 0);
    }
}
