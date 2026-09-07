import {
    ModerationModel,
    ModerationOptions,
    ModerationPromptLike,
    ModerationResponse,
    ModerationResult,
} from "@nodeboot/ai-core";

export interface MistralModerationClientLike {
    classifiers: {
        moderate(params: any): Promise<any>;
    };
}

export class MistralModerationModel implements ModerationModel {
    private readonly client: MistralModerationClientLike;
    private readonly defaultOptions: ModerationOptions;

    constructor(client: MistralModerationClientLike, defaultOptions?: ModerationOptions) {
        this.client = client;
        this.defaultOptions = {
            model: "mistral-moderation-latest",
            ...defaultOptions,
        };
    }

    getDefaultOptions(): ModerationOptions {
        return this.defaultOptions;
    }

    async call(prompt: ModerationPromptLike | string): Promise<ModerationResponse> {
        const input = typeof prompt === "string" ? prompt : prompt.getInstructions();
        const promptOptions = typeof prompt === "string" ? undefined : prompt.getOptions?.();
        const options: ModerationOptions = {...this.defaultOptions, ...promptOptions};

        const response = await this.client.classifiers.moderate({
            model: options.model ?? "mistral-moderation-latest",
            inputs: Array.isArray(input) ? input : [input],
        });

        const results: ModerationResult[] = (response.results ?? []).map((item: any) => {
            const categories = item.categories ?? {};
            return {
                flagged: Object.values(categories).some(Boolean),
                categories,
                categoryScores: item.category_scores,
            };
        });

        return {
            result: results[0] ?? {flagged: false},
            results,
            metadata: {
                id: response.id,
                model: response.model,
            },
        };
    }
}
