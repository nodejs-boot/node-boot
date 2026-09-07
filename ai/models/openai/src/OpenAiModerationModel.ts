import {
    ModerationModel,
    ModerationOptions,
    ModerationPromptLike,
    ModerationResponse,
    ModerationResult,
} from "@nodeboot/ai-core";

export interface OpenAiModerationClientLike {
    moderations: {
        create(params: any): Promise<any>;
    };
}

export class OpenAiModerationModel implements ModerationModel {
    private readonly client: OpenAiModerationClientLike;
    private readonly defaultOptions: ModerationOptions;

    constructor(client: OpenAiModerationClientLike, defaultOptions?: ModerationOptions) {
        this.client = client;
        this.defaultOptions = {
            model: "omni-moderation-latest",
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

        const response = await this.client.moderations.create({
            model: options.model,
            input,
        });

        const results: ModerationResult[] = (response.results ?? []).map((item: any) => ({
            flagged: item.flagged,
            categories: item.categories,
            categoryScores: item.category_scores,
        }));

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
