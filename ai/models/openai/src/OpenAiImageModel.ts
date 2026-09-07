import {ImageGeneration, ImageModel, ImageOptions, ImagePromptLike, ImageResponse} from "@nodeboot/ai-core";

export interface OpenAiImageClientLike {
    images: {
        generate(params: any): Promise<any>;
    };
}

export class OpenAiImageModel implements ImageModel {
    private readonly client: OpenAiImageClientLike;
    private readonly defaultOptions: ImageOptions;

    constructor(client: OpenAiImageClientLike, defaultOptions?: ImageOptions) {
        this.client = client;
        this.defaultOptions = {
            model: "dall-e-3",
            n: 1,
            size: "1024x1024",
            ...defaultOptions,
        };
    }

    getDefaultOptions(): ImageOptions {
        return this.defaultOptions;
    }

    async call(prompt: ImagePromptLike | string): Promise<ImageResponse> {
        const promptText = typeof prompt === "string" ? prompt : prompt.getInstructions();
        const promptOptions = typeof prompt === "string" ? undefined : prompt.getOptions?.();
        const options: ImageOptions = {...this.defaultOptions, ...promptOptions};

        const response = await this.client.images.generate({
            model: options.model,
            prompt: promptText,
            n: options.n,
            size: options.size,
            quality: options.quality,
            style: options.style,
            response_format: options.responseFormat,
        });

        const results: ImageGeneration[] = (response.data ?? []).map((item: any) => ({
            image: {
                url: item.url,
                b64Json: item.b64_json,
            },
            metadata: {
                revisedPrompt: item.revised_prompt,
            },
        }));

        return {
            result: results[0] ?? {image: {}},
            results,
            metadata: {
                model: options.model,
                created: response.created,
            },
        };
    }
}
